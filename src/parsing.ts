import {MarkdownNode} from './ast';

export type ParsingOptions = {
    /**
     * Whether to parse blocks, like headings, quotes, lists, code blocks and rules.
     *
     * Defaults to true. Turning it off parses only inline formatting and paragraphs,
     * which suits short texts, like titles.
     */
    blocks?: boolean,
};

export function parse(markdown: string, options: ParsingOptions = {}): MarkdownNode {
    if (options.blocks === false) {
        return MarkdownParser.parse(markdown);
    }

    return BlockParser.parse(markdown);
}

export function unescape(input: string): string {
    if (!input.includes('\\')) {
        // Optimization for cases where there are no escape sequences
        return input;
    }

    let text = '';

    for (let index = 0; index < input.length; index++) {
        const char = input[index];

        if (char === '\\' && index + 1 < input.length) {
            text += input[++index];

            continue;
        }

        text += char;
    }

    return text;
}

class MismatchError extends Error {
    public constructor() {
        super('Mismatched token');

        Object.setPrototypeOf(this, MismatchError.prototype);
    }
}

class MarkdownParser {
    private readonly chars: string[];

    private index = 0;

    private static readonly NEWLINE = ['\r\n', '\r', '\n'];

    private static readonly NEW_PARAGRAPH = MarkdownParser.NEWLINE
        .flatMap(prefix => MarkdownParser.NEWLINE.map(suffix => prefix + suffix));

    private constructor(input: string) {
        this.chars = [...input];
    }

    public static parse(input: string): MarkdownNode {
        return new MarkdownParser(input).parseNext();
    }

    private parseNext(end: string = ''): MarkdownNode {
        const root: MarkdownNode<'fragment'> = {
            type: 'fragment',
            children: [],
            source: '',
        };

        const startIndex = this.index;

        let text = '';

        let paragraphStartIndex = this.index;
        let textStartIndex = this.index;

        while (!this.done) {
            const escapedText = this.parseText('');

            if (escapedText !== '') {
                text += escapedText;

                continue;
            }

            if (end !== '' && (this.matches(end) || this.matches(...MarkdownParser.NEWLINE))) {
                break;
            }

            if (this.matches(...MarkdownParser.NEW_PARAGRAPH)) {
                const paragraphEndIndex = this.index;

                while (MarkdownParser.NEWLINE.includes(this.current)) {
                    this.advance();
                }

                if (text !== '' || root.children.length > 0) {
                    let paragraph: MarkdownNode = root.children[root.children.length - 1];

                    if (paragraph?.type !== 'paragraph') {
                        paragraph = {
                            type: 'paragraph',
                            children: root.children,
                            source: '',
                        };

                        root.children = [paragraph];
                    }

                    paragraph.source = this.getSlice(paragraphStartIndex, paragraphEndIndex);

                    if (text !== '') {
                        paragraph.children.push({
                            type: 'text',
                            content: text,
                            source: this.getSlice(textStartIndex, paragraphEndIndex),
                        });

                        text = '';
                    }

                    root.children.push({
                        type: 'paragraph',
                        children: [],
                        source: '',
                    });
                }

                paragraphStartIndex = this.index;
                textStartIndex = this.index;

                continue;
            }

            const nodeStartIndex = this.index;

            let node: MarkdownNode|null = null;

            try {
                node = this.parseCurrent();
            } catch (error) {
                if (!(error instanceof MismatchError)) {
                    /* istanbul ignore next */
                    throw error;
                }
            }

            if (node === null) {
                this.seek(nodeStartIndex);

                text += this.current;

                this.advance();

                continue;
            }

            let parent = root.children[root.children.length - 1];

            if (parent?.type !== 'paragraph') {
                parent = root;
            }

            if (text !== '') {
                parent.children.push({
                    type: 'text',
                    content: text,
                    source: this.getSlice(textStartIndex, nodeStartIndex),
                });
            }

            text = '';

            textStartIndex = this.index;

            parent.children.push(node);
        }

        if (text !== '') {
            let parent = root.children[root.children.length - 1];

            if (parent?.type !== 'paragraph') {
                parent = root;
            }

            parent.children.push({
                type: 'text',
                content: text,
                source: this.getSlice(textStartIndex, this.index),
            });
        }

        const lastNode = root.children[root.children.length - 1];

        if (lastNode?.type === 'paragraph') {
            if (lastNode.children.length === 0) {
                root.children.pop();
            } else {
                lastNode.source = this.getSlice(paragraphStartIndex, this.index);
            }
        }

        if (root.children.length === 1) {
            return root.children[0];
        }

        root.source = this.getSlice(startIndex, this.index);

        return root;
    }

    private parseCurrent(): MarkdownNode|null {
        const char = this.lookAhead();
        const startIndex = this.index;

        switch (char) {
            case '*':
            case '_': {
                const delimiter = this.matches('**') ? '**' : char;

                this.advance(delimiter.length);

                const children = this.parseNext(delimiter);

                this.match(delimiter);

                return {
                    type: delimiter.length === 1 ? 'italic' : 'bold',
                    children: children,
                    source: this.getSlice(startIndex, this.index),
                };
            }

            case '~': {
                this.match('~~');

                const children = this.parseNext('~~');

                this.match('~~');

                return {
                    type: 'strike',
                    children: children,
                    source: this.getSlice(startIndex, this.index),
                };
            }

            case '`': {
                if (this.matches('```')) {
                    return null;
                }

                const delimiter = this.matches('``') ? '``' : '`';

                this.match(delimiter);

                const content = this.parseText(delimiter).trim();

                if (this.matches('```')) {
                    return null;
                }

                this.match(delimiter);

                return {
                    type: 'code',
                    content: content,
                    source: this.getSlice(startIndex, this.index),
                };
            }

            case '!': {
                this.advance();

                this.match('[');

                const alt = this.parseText(']');

                this.match('](');

                const src = this.parseText(')');

                this.match(')');

                return {
                    type: 'image',
                    src: src,
                    alt: alt,
                    source: this.getSlice(startIndex, this.index),
                };
            }

            case '[': {
                this.advance();

                const label = this.parseNext(']');

                this.match('](');

                const href = this.parseText(')', '"');

                let title: string|undefined;

                if (this.matches('"')) {
                    this.match('"');

                    title = this.parseText('"');

                    this.match('"');
                }

                this.match(')');

                return {
                    type: 'link',
                    href: href.trim(),
                    ...(title !== undefined ? {title: title} : {}),
                    children: label,
                    source: this.getSlice(startIndex, this.index),
                };
            }

            default:
                return null;
        }
    }

    private parseText(...end: string[]): string {
        let text = '';

        while (!this.done) {
            if (this.current === '\\' && this.index + 1 < this.length) {
                this.advance();

                text += this.current;

                this.advance();

                continue;
            }

            if (end.some(token => (token === '' || this.matches(token))) || this.matches(...MarkdownParser.NEWLINE)) {
                break;
            }

            text += this.current;

            this.advance();
        }

        return text;
    }

    private get done(): boolean {
        return this.index >= this.length;
    }

    private get length(): number {
        return this.chars.length;
    }

    private get current(): string {
        return this.chars[this.index];
    }

    private advance(length: number = 1): void {
        this.index += length;
    }

    private seek(index: number): void {
        this.index = index;
    }

    private matches(...lookahead: string[]): boolean {
        return lookahead.some(substring => this.lookAhead(substring.length) === substring);
    }

    private match(...lookahead: string[]): void {
        for (const substring of lookahead) {
            if (this.lookAhead(substring.length) === substring) {
                this.advance(substring.length);

                return;
            }
        }

        throw new MismatchError();
    }

    private lookAhead(length: number = 1): string {
        if (length === 1) {
            return this.current;
        }

        return this.getSlice(this.index, this.index + length);
    }

    private getSlice(start: number, end: number): string {
        return this.chars
            .slice(start, end)
            .join('');
    }
}

type Line = {
    content: string,
    newline: string,
};

type ListMarker = {
    /**
     * The bullet, or the delimiter after the number, which the items of the same list share.
     */
    kind: string,
    ordered: boolean,
    start: number,
    offset: number,
    content: string,
};

type ListSibling = {
    index: number,
    marker: ListMarker,
    separated: boolean,
};

type ListItem = {
    node: MarkdownNode<'listItem'>,
    separated: boolean,
};

type Container = {
    nodes: MarkdownNode[],
    separated: boolean,
};

class BlockParser {
    private static readonly TAB_SIZE = 4;

    private static readonly BLANK = /^[ \t]*$/;

    private static readonly HEADING = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;

    private static readonly UNDERLINE = /^ {0,3}(=+|-+)[ \t]*$/;

    private static readonly RULE = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;

    private static readonly QUOTE = /^ {0,3}>/;

    private static readonly EMPTY_QUOTE = /^ {0,3}>[ \t]*$/;

    private static readonly FENCE = /^( {0,3})(?:(`{3,})([^`]*)|(~{3,})(.*))$/;

    private static readonly CLOSING_FENCE = /^ {0,3}(`{3,}|~{3,})[ \t]*$/;

    private static readonly LIST_ITEM = /^( {0,3})([-*+]|\d{1,9}[.)])(?:([ \t]+)(.*))?$/;

    private readonly lines: Line[];

    private index = 0;

    /**
     * Whether a blank line lies between two of the blocks read, like two paragraphs.
     */
    private separated = false;

    private constructor(lines: Line[]) {
        this.lines = lines;
    }

    public static parse(input: string): MarkdownNode {
        const nodes = new BlockParser(BlockParser.split(input)).parseBlocks();

        if (nodes === null) {
            // Without blocks, the input parses exactly as it does when blocks are not parsed
            return MarkdownParser.parse(input);
        }

        if (nodes.length === 1) {
            return nodes[0];
        }

        return {
            type: 'fragment',
            children: nodes,
            source: input,
        };
    }

    /**
     * Parses what a block holds, like the lines of a quote, whose text always reads as paragraphs.
     */
    private static parseContent(lines: Line[]): Container {
        const parser = new BlockParser(lines);
        const nodes = parser.parseBlocks();

        return {
            nodes: nodes ?? BlockParser.parseParagraphs(lines),
            separated: parser.separated,
        };
    }

    private parseBlocks(): MarkdownNode[]|null {
        const nodes: MarkdownNode[] = [];
        const text: Line[] = [];

        let found = false;
        let read = false;
        let blank = false;

        while (!this.done) {
            const line = this.current;

            if (BlockParser.BLANK.test(line.content)) {
                blank = read;

                text.push(line);

                this.advance();

                continue;
            }

            if (blank) {
                this.separated = true;
            }

            blank = false;
            read = true;

            // A paragraph is open while the line before is part of it
            const open = text.length > 0 && !BlockParser.BLANK.test(text[text.length - 1].content);
            const block = (open ? this.parseUnderlinedHeading(text) : null) ?? this.parseBlock(open);

            if (block === null) {
                text.push(line);

                this.advance();

                continue;
            }

            nodes.push(...BlockParser.parseParagraphs(text.splice(0)), block);

            found = true;
        }

        nodes.push(...BlockParser.parseParagraphs(text));

        return found ? nodes : null;
    }

    private static parseParagraphs(lines: Line[]): MarkdownNode[] {
        const paragraphs: MarkdownNode[] = [];

        let start = 0;

        for (let index = 0; index <= lines.length; index++) {
            if (index < lines.length && !BlockParser.BLANK.test(lines[index].content)) {
                continue;
            }

            if (index > start) {
                const paragraph = lines.slice(start, index);
                const node = MarkdownParser.parse(BlockParser.trim(paragraph));

                paragraphs.push({
                    type: 'paragraph',
                    children: node.type === 'fragment' ? node.children : [node],
                    source: BlockParser.join(paragraph),
                });
            }

            start = index + 1;
        }

        return paragraphs;
    }

    private parseBlock(interrupting: boolean): MarkdownNode|null {
        const line = this.current.content;

        if (BlockParser.RULE.test(line)) {
            this.advance();

            return {
                type: 'rule',
                source: line,
            };
        }

        const heading = BlockParser.HEADING.exec(line);

        if (heading !== null) {
            this.advance();

            return {
                type: 'heading',
                level: heading[1].length,
                children: MarkdownParser.parse(heading[2] ?? ''),
                source: line,
            };
        }

        if (BlockParser.QUOTE.test(line)) {
            return this.parseQuote();
        }

        return this.parseCodeBlock() ?? this.parseList(interrupting);
    }

    /**
     * Parses the paragraph that ends the given text as a heading, when underlined by the current line.
     */
    private parseUnderlinedHeading(text: Line[]): MarkdownNode<'heading'>|null {
        const underline = BlockParser.UNDERLINE.exec(this.current.content);

        if (underline === null) {
            return null;
        }

        let start = text.length;

        while (start > 0 && !BlockParser.BLANK.test(text[start - 1].content)) {
            start--;
        }

        const lines = text.splice(start);

        lines.push(this.current);

        this.advance();

        return {
            type: 'heading',
            level: underline[1][0] === '=' ? 1 : 2,
            children: MarkdownParser.parse(BlockParser.trim(lines.slice(0, -1))),
            source: BlockParser.join(lines),
        };
    }

    private parseQuote(): MarkdownNode<'quote'> {
        const start = this.index;
        const lines: Line[] = [];

        while (!this.done) {
            const {content, newline} = this.current;
            const marker = BlockParser.QUOTE.exec(content);

            if (marker !== null) {
                lines.push({
                    // The space after the marker is part of it, even when it is part of a tab
                    content: BlockParser.dedent(content.slice(marker[0].length), 1, marker[0].length),
                    newline: newline,
                });

                this.advance();

                continue;
            }

            // A line without the marker continues the quote's paragraph, unless it starts a block
            if (BlockParser.BLANK.test(content) || !BlockParser.continuesParagraph(lines)) {
                break;
            }

            if (BlockParser.startsBlock(content)) {
                break;
            }

            lines.push(this.current);

            this.advance();
        }

        return {
            type: 'quote',
            children: BlockParser.parseContent(lines).nodes,
            source: BlockParser.join(this.lines.slice(start, this.index)),
        };
    }

    private parseCodeBlock(): MarkdownNode<'codeBlock'>|null {
        const fence = BlockParser.FENCE.exec(this.current.content);

        if (fence === null) {
            return null;
        }

        const [, indent, backticks, backtickInfo, tildes, tildeInfo] = fence;
        const delimiter = backticks ?? tildes;
        const [word] = (backtickInfo ?? tildeInfo)
            .trim()
            .split(/[ \t]/);
        const language = unescape(word);
        const start = this.index;

        let end = start + 1;

        // A fence that is never closed runs to the end of what holds it
        while (end < this.lines.length && !BlockParser.closes(this.lines[end].content, delimiter)) {
            end++;
        }

        // The content is as indented as it is past the fence's own indentation
        const content = this.lines
            .slice(start + 1, end)
            .map(
                line => ({
                    content: BlockParser.dedent(line.content, indent.length),
                    newline: line.newline,
                }),
            );

        this.seek(Math.min(end + 1, this.lines.length));

        return {
            type: 'codeBlock',
            content: BlockParser.join(content),
            ...(language !== '' ? {language: language} : {}),
            source: BlockParser.join(this.lines.slice(start, end + 1)),
        };
    }

    private parseList(interrupting: boolean): MarkdownNode<'list'>|null {
        const first = BlockParser.matchListItem(this.current.content);

        // A list only interrupts a paragraph where it can't be read as text, so neither when its
        // item is empty nor when it counts from another number than 1
        if (first === null || (interrupting && (first.content === '' || (first.ordered && first.start !== 1)))) {
            return null;
        }

        const start = this.index;
        const items: ListItem[] = [];

        for (
            let sibling: ListSibling|null = {index: start, marker: first, separated: false};
            sibling !== null;
            sibling = this.findSibling(first.kind)
        ) {
            this.seek(sibling.index);

            const item = this.parseListItem(sibling.marker);

            items.push({
                ...item,
                separated: item.separated || sibling.separated,
            });
        }

        // A list is loose when a blank line sets its items or the blocks of an item apart
        const tight = items.every(item => !item.separated);

        return {
            type: 'list',
            ordered: first.ordered,
            ...(first.ordered ? {start: first.start} : {}),
            tight: tight,
            items: items.map(
                ({node}) => ({
                    ...node,
                    // The text of the items of a tight list reads as it is, rather than as paragraphs
                    children: tight
                        ? node.children.flatMap(child => (child.type === 'paragraph' ? child.children : [child]))
                        : node.children,
                }),
            ),
            source: BlockParser.join(this.lines.slice(start, this.index)),
        };
    }

    private parseListItem(marker: ListMarker): ListItem {
        const start = this.index;
        const lines: Line[] = [
            {
                content: marker.content,
                newline: this.current.newline,
            },
        ];

        this.advance();

        // An item that starts with a blank line can't start with two, so another one ends it
        if (marker.content !== '' || this.done || !BlockParser.BLANK.test(this.current.content)) {
            this.parseListItemLines(marker, lines);
        }

        const content = BlockParser.parseContent(lines);

        return {
            node: {
                type: 'listItem',
                children: content.nodes,
                source: BlockParser.join(this.lines.slice(start, this.index)),
            },
            separated: content.separated,
        };
    }

    private parseListItemLines(marker: ListMarker, lines: Line[]): void {
        while (!this.done) {
            const {content, newline} = this.current;

            if (BlockParser.BLANK.test(content)) {
                const next = this.findNextContent();

                // A blank line belongs to the item when what follows is indented into it, like
                // another paragraph of the item
                if (next === null || BlockParser.indent(this.lines[next].content) < marker.offset) {
                    return;
                }

                lines.push({
                    content: '',
                    newline: newline,
                });

                this.advance();

                continue;
            }

            if (BlockParser.indent(content) >= marker.offset) {
                lines.push({
                    content: BlockParser.dedent(content, marker.offset),
                    newline: newline,
                });

                this.advance();

                continue;
            }

            // A line right after the item's paragraph continues it, unless it starts a block
            if (!BlockParser.continuesParagraph(lines) || BlockParser.startsBlock(content)) {
                return;
            }

            lines.push(this.current);

            this.advance();
        }
    }

    /**
     * Finds the next item of a list of the given kind, past any blank lines, which keep items in
     * the same list.
     */
    private findSibling(kind: string): ListSibling|null {
        const index = this.findNextContent();

        if (index === null) {
            return null;
        }

        const marker = BlockParser.matchListItem(this.lines[index].content);

        if (marker === null || marker.kind !== kind) {
            return null;
        }

        return {
            index: index,
            marker: marker,
            separated: index > this.index,
        };
    }

    private findNextContent(): number|null {
        for (let {index} = this; index < this.lines.length; index++) {
            if (!BlockParser.BLANK.test(this.lines[index].content)) {
                return index;
            }
        }

        return null;
    }

    /**
     * Tells whether a line past what holds a paragraph, like a quote, starts a block rather than
     * continuing the paragraph.
     *
     * Any list item does, as the paragraph it would interrupt is no longer at its level.
     */
    private static startsBlock(line: string): boolean {
        return BlockParser.RULE.test(line)
            || BlockParser.HEADING.test(line)
            || BlockParser.QUOTE.test(line)
            || BlockParser.FENCE.test(line)
            || BlockParser.matchListItem(line) !== null;
    }

    /**
     * Tells whether the lines end in a paragraph still open, which a line right after them continues.
     */
    private static continuesParagraph(lines: Line[]): boolean {
        let fence: string|null = null;

        for (const {content} of lines) {
            if (fence !== null) {
                fence = BlockParser.closes(content, fence) ? null : fence;

                continue;
            }

            const opening = BlockParser.FENCE.exec(content);

            fence = opening === null ? null : opening[2] ?? opening[4];
        }

        const last = lines[lines.length - 1].content;
        const item = BlockParser.matchListItem(last);

        return fence === null
            && !BlockParser.BLANK.test(last)
            && !BlockParser.HEADING.test(last)
            && !BlockParser.UNDERLINE.test(last)
            && !BlockParser.RULE.test(last)
            && !BlockParser.CLOSING_FENCE.test(last)
            && !BlockParser.EMPTY_QUOTE.test(last)
            && (item === null || item.content !== '');
    }

    private static closes(line: string, delimiter: string): boolean {
        const closing = BlockParser.CLOSING_FENCE.exec(line);

        return closing !== null && closing[1][0] === delimiter[0] && closing[1].length >= delimiter.length;
    }

    private static matchListItem(line: string): ListMarker|null {
        const match = BlockParser.LIST_ITEM.exec(line);

        if (match === null || BlockParser.RULE.test(line)) {
            return null;
        }

        const [, indent, marker, spacing = '', content = ''] = match;
        const ordered = /\d/.test(marker);
        const column = indent.length + marker.length;
        const width = BlockParser.columns(spacing, column);

        // The content starts a column past the marker when empty, or when set as far apart as code
        // would be, which keeps the columns past that one as spaces
        const gap = content === '' || width > BlockParser.TAB_SIZE ? 1 : width;

        return {
            kind: ordered ? marker.slice(-1) : marker,
            ordered: ordered,
            start: ordered ? Number.parseInt(marker, 10) : 1,
            offset: column + gap,
            content: content === '' ? '' : ' '.repeat(width - gap) + content,
        };
    }

    /**
     * Returns how many columns the given whitespace spans from the given column, with tabs
     * reaching the next tab stop.
     */
    private static columns(whitespace: string, start = 0): number {
        let column = start;

        for (const char of whitespace) {
            column = char === '\t' ? column + BlockParser.TAB_SIZE - (column % BlockParser.TAB_SIZE) : column + 1;
        }

        return column - start;
    }

    private static indent(line: string): number {
        return BlockParser.columns(line.slice(0, line.search(/[^ \t]|$/)));
    }

    /**
     * Removes up to the given columns of indentation from a line starting at the given column,
     * keeping the columns of a tab past them as spaces.
     */
    private static dedent(line: string, width: number, start = 0): string {
        let column = start;
        let index = 0;

        while (index < line.length && column - start < width && (line[index] === ' ' || line[index] === '\t')) {
            const next = column + BlockParser.columns(line[index], column);

            if (next - start > width) {
                return ' '.repeat(next - start - width) + line.slice(index + 1);
            }

            column = next;

            index++;
        }

        return line.slice(index);
    }

    private static split(input: string): Line[] {
        const parts = input.split(/(\r\n|\r|\n)/);
        const lines: Line[] = [];

        for (let index = 0; index < parts.length; index += 2) {
            lines.push({
                content: parts[index],
                newline: parts[index + 1] ?? '',
            });
        }

        return lines;
    }

    /**
     * Returns the text of a paragraph's lines, without the spaces they start with or it ends with.
     */
    private static trim(lines: Line[]): string {
        return BlockParser.join(
            lines.map(
                line => ({
                    content: line.content.replace(/^[ \t]+/, ''),
                    newline: line.newline,
                }),
            ),
        ).replace(/[ \t]+$/, '');
    }

    private static join(lines: Line[]): string {
        return lines
            .map((line, index) => line.content + (index < lines.length - 1 ? line.newline : ''))
            .join('');
    }

    private get done(): boolean {
        return this.index >= this.lines.length;
    }

    private get current(): Line {
        return this.lines[this.index];
    }

    private advance(): void {
        this.index++;
    }

    private seek(index: number): void {
        this.index = index;
    }
}
