import {MarkdownNode} from './ast';

export type ParsingOptions = {
    /**
     * Whether to parse blocks, like headings, quotes, lists, code blocks and rules.
     *
     * Defaults to false, which parses only inline formatting and paragraphs, as suits short
     * texts, like titles.
     */
    blocks?: boolean,
};

export function parse(markdown: string, options: ParsingOptions = {}): MarkdownNode {
    if (options.blocks === true) {
        return BlockParser.parse(markdown);
    }

    return MarkdownParser.parse(markdown);
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

/**
 * The deepest nodes nest, past which they are read as text.
 *
 * This keeps deeply nested input from exhausting the stack.
 */
const MAX_NESTING = 100;

/**
 * Where each character of a text is in the Markdown it was read from.
 */
type SourceMap = {
    markdown: string,
    positions: number[],
};

class MarkdownParser {
    private readonly chars: string[];

    private readonly map: SourceMap;

    /**
     * Where each node ends, by the position it starts at.
     */
    private readonly ends: Map<number, number>;

    private index = 0;

    private depth = 0;

    private static readonly NEWLINE = ['\r\n', '\r', '\n'];

    private static readonly NEW_PARAGRAPH = MarkdownParser.NEWLINE
        .flatMap(prefix => MarkdownParser.NEWLINE.map(suffix => prefix + suffix))
        // A carriage return followed by a line feed is a single newline
        .filter(newlines => newlines !== '\r\n');

    /**
     * The texts that end the content of a node, which may hold other nodes.
     */
    private static readonly NODE_ENDINGS = ['*', '**', '_', '~~', ']'];

    /**
     * The texts that end the plain parts of a node, like the content of inline code.
     */
    private static readonly TEXT_ENDINGS = ['`', '``', ']', ')', '"'];

    /**
     * The characters that may start a node, end what is read or escape another character.
     */
    private static readonly SPECIAL_CHARS = '*_~`![])"\\\r\n';

    private constructor(input: string, map: SourceMap|null) {
        this.chars = [...input];
        this.map = map ?? MarkdownParser.createSourceMap(input, this.chars);
        this.ends = MarkdownParser.findEnds(this.chars);
    }

    /**
     * Parses the given text into a tree of nodes.
     *
     * The nodes have their source in the Markdown the map gives, if any, like a paragraph of
     * a quote, whose source reads with the quote's markers.
     */
    public static parse(input: string, map: SourceMap|null = null): MarkdownNode {
        return new MarkdownParser(input, map).parseNext();
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
            const char = this.current;

            // A character that can't start a node or end what is read is always text
            if (!MarkdownParser.SPECIAL_CHARS.includes(char)) {
                text += char;

                this.advance();

                continue;
            }

            if (char === '\\' && this.index + 1 < this.length) {
                text += this.chars[this.index + 1];

                this.advance(2);

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

                    paragraph.source = this.getSource(paragraphStartIndex, paragraphEndIndex);

                    if (text !== '') {
                        paragraph.children.push({
                            type: 'text',
                            content: text,
                            source: this.getSource(textStartIndex, paragraphEndIndex),
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
            const node = this.parseCurrent();

            if (node === null) {
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
                    source: this.getSource(textStartIndex, nodeStartIndex),
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
                source: this.getSource(textStartIndex, this.index),
            });
        }

        const lastNode = root.children[root.children.length - 1];

        if (lastNode?.type === 'paragraph') {
            if (lastNode.children.length === 0) {
                root.children.pop();
            } else {
                lastNode.source = this.getSource(paragraphStartIndex, this.index);
            }
        }

        if (root.children.length === 1) {
            return root.children[0];
        }

        root.source = this.getSource(startIndex, this.index);

        return root;
    }

    private parseCurrent(): MarkdownNode|null {
        const end = this.ends.get(this.index);

        if (end === undefined) {
            return null;
        }

        const source = this.getSource(this.index, end);

        let node: MarkdownNode = {
            type: 'text',
            content: unescape(source),
            source: source,
        };

        if (this.depth < MAX_NESTING) {
            this.depth++;

            node = this.parseNode(source);

            this.depth--;
        }

        this.seek(end);

        return node;
    }

    /**
     * Parses the node at the current position, which is known to end, with the given source.
     */
    private parseNode(source: string): MarkdownNode {
        const char = this.current;

        switch (char) {
            case '*':
            case '_': {
                const delimiter = this.matches('**') ? '**' : char;

                this.advance(delimiter.length);

                return {
                    type: delimiter.length === 1 ? 'italic' : 'bold',
                    children: this.parseNext(delimiter),
                    source: source,
                };
            }

            case '~':
                this.advance(2);

                return {
                    type: 'strike',
                    children: this.parseNext('~~'),
                    source: source,
                };

            case '`': {
                const delimiter = this.matches('``') ? '``' : '`';

                this.advance(delimiter.length);

                return {
                    type: 'code',
                    content: this.parseText(delimiter).trim(),
                    source: source,
                };
            }

            case '!': {
                this.advance(2);

                const alt = this.parseText(']');

                this.advance(2);

                return {
                    type: 'image',
                    src: this.parseText(')'),
                    alt: alt,
                    source: source,
                };
            }

            default: {
                // A link, as no other node starts with another character
                this.advance();

                const label = this.parseNext(']');

                this.advance(2);

                const href = this.parseText(')', '"');
                const title = this.match('"') ? this.parseText('"') : undefined;

                return {
                    type: 'link',
                    href: href.trim(),
                    ...(title !== undefined ? {title: title} : {}),
                    children: label,
                    source: source,
                };
            }
        }
    }

    private parseText(...end: string[]): string {
        let text = '';

        while (!this.done) {
            const char = this.current;

            if (char === '\\' && this.index + 1 < this.length) {
                text += this.chars[this.index + 1];

                this.advance(2);

                continue;
            }

            if (
                MarkdownParser.SPECIAL_CHARS.includes(char)
                && (this.matches(...end) || this.matches(...MarkdownParser.NEWLINE))
            ) {
                break;
            }

            text += char;

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
        for (const substring of lookahead) {
            if (MarkdownParser.matchesAt(this.chars, this.index, substring)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Moves past the given text when it comes next, and tells whether it does.
     */
    private match(substring: string): boolean {
        if (!this.matches(substring)) {
            return false;
        }

        this.advance(substring.length);

        return true;
    }

    private getSource(start: number, end: number): string {
        if (start === end) {
            return '';
        }

        const {markdown, positions} = this.map;

        return markdown.slice(positions[start], positions[end - 1] + this.chars[end - 1].length);
    }

    /**
     * Returns the map of a text read from itself.
     */
    private static createSourceMap(input: string, chars: string[]): SourceMap {
        const positions: number[] = [];

        let position = 0;

        for (const char of chars) {
            positions.push(position);
            position += char.length;
        }

        return {
            markdown: input,
            positions: positions,
        };
    }

    /**
     * Finds where each node ends, from the last position to the first.
     *
     * Where a node ends depends only on what comes after it, so each one is found by looking up
     * where the parts after it end, rather than by reading them again. This keeps unclosed
     * delimiters, like `[[[`, from being read over and over, and the parser from trying nodes
     * that never end.
     */
    private static findEnds(chars: string[]): Map<number, number> {
        const {length} = chars;

        // Reading stops and nodes start only at special characters, so each position has the slot
        // of the first of them from it on, counting from the end, which has slot 0
        const slots = new Array<number>(length + 1);
        const positions = [length];

        slots[length] = 0;

        for (let index = length - 1; index >= 0; index--) {
            if (MarkdownParser.SPECIAL_CHARS.includes(chars[index])) {
                slots[index] = positions.length;
                positions.push(index);
            } else {
                slots[index] = slots[index + 1];
            }
        }

        // Where reading from each slot stops, for each of the texts that end what is read
        const nodeStops: Record<string, number[]> = {};
        const textStops: Record<string, number[]> = {};

        for (const ending of MarkdownParser.NODE_ENDINGS) {
            nodeStops[ending] = new Array<number>(positions.length).fill(length);
        }

        for (const ending of MarkdownParser.TEXT_ENDINGS) {
            textStops[ending] = new Array<number>(positions.length).fill(length);
        }

        const findNodeStop = (ending: string, index: number): number => nodeStops[ending][slots[index]];
        const findTextStop = (ending: string, index: number): number => textStops[ending][slots[index]];

        const matches = (index: number, substring: string): boolean => (
            MarkdownParser.matchesAt(chars, index, substring)
        );

        // Returns the position past the given text when it is at the given position, or -1
        const close = (index: number, substring: string): number => (
            matches(index, substring) ? index + substring.length : -1
        );

        const findEnd = (index: number): number => {
            const char = chars[index];

            switch (char) {
                case '*':
                case '_': {
                    const delimiter = matches(index, '**') ? '**' : char;

                    return close(findNodeStop(delimiter, index + delimiter.length), delimiter);
                }

                case '~':
                    return matches(index, '~~') ? close(findNodeStop('~~', index + 2), '~~') : -1;

                case '`': {
                    if (matches(index, '```')) {
                        return -1;
                    }

                    const delimiter = matches(index, '``') ? '``' : '`';
                    const end = findTextStop(delimiter, index + delimiter.length);

                    return matches(end, '```') ? -1 : close(end, delimiter);
                }

                case '!': {
                    const src = matches(index + 1, '[') ? close(findTextStop(']', index + 2), '](') : -1;

                    return src < 0 ? -1 : close(findTextStop(')', src), ')');
                }

                case '[': {
                    const href = close(findNodeStop(']', index + 1), '](');

                    if (href < 0) {
                        return -1;
                    }

                    // The target ends at the closing parenthesis or at the title, whichever comes first
                    const end = Math.min(findTextStop(')', href), findTextStop('"', href));

                    if (!matches(end, '"')) {
                        return close(end, ')');
                    }

                    const title = close(findTextStop('"', end + 1), '"');

                    return title < 0 ? -1 : close(title, ')');
                }

                default:
                    return -1;
            }
        };

        const ends = new Map<number, number>();

        for (let slot = 1; slot < positions.length; slot++) {
            const index = positions[slot];
            const char = chars[index];

            // An escaped character is read along with the backslash, as text
            const escaped = char === '\\' && index + 1 < length;
            const newline = char === '\r' || char === '\n';

            for (const ending of MarkdownParser.TEXT_ENDINGS) {
                const stops = textStops[ending];

                if (escaped) {
                    stops[slot] = stops[slots[index + 2]];
                } else if (newline || matches(index, ending)) {
                    stops[slot] = index;
                } else {
                    stops[slot] = stops[slots[index + 1]];
                }
            }

            const end = findEnd(index);

            if (end >= 0) {
                ends.set(index, end);
            }

            for (const ending of MarkdownParser.NODE_ENDINGS) {
                const stops = nodeStops[ending];

                if (escaped) {
                    stops[slot] = stops[slots[index + 2]];
                } else if (newline || matches(index, ending)) {
                    stops[slot] = index;
                } else {
                    // A node is read as a whole, so what ends it can't end what holds it
                    stops[slot] = stops[slots[end < 0 ? index + 1 : end]];
                }
            }
        }

        return ends;
    }

    private static matchesAt(chars: string[], index: number, substring: string): boolean {
        for (let offset = 0; offset < substring.length; offset++) {
            if (chars[index + offset] !== substring[offset]) {
                return false;
            }
        }

        return true;
    }
}

type Line = {
    /**
     * The text of the line, past the markers of what holds it, like those of a quote.
     */
    content: string,

    /**
     * Where the content starts in the input, past its padding.
     */
    start: number,

    /**
     * The spaces the content starts with that are not in the input.
     *
     * They are what is left of a tab that the markers end within.
     */
    padding: number,

    /**
     * Where the text of the content starts, past the spaces and tabs it starts with.
     *
     * It is the length of the content when the line is blank.
     */
    text: number,

    newline: string,
};

type ListMarker = {
    /**
     * The bullet, or the character after the number, which the items of the same list share.
     */
    delimiter: string,

    /**
     * The number of an ordered item, or null for a bullet.
     */
    start: number|null,

    /**
     * The column the content starts at, which the lines of the item are indented to.
     */
    offset: number,

    content: Line,
};

type ListSibling = {
    marker: ListMarker,
    separated: boolean,
};

type Fence = {
    delimiter: string,
    indent: number,
    info: string,
};

/**
 * What a line starts, as told by its first character past the indentation.
 */
type Block =
    | {
        type: 'blank'|'text'|'rule',
    }
    | {
        type: 'heading',
        level: number,
        content: Line,
    }
    | {
        type: 'quote',
        content: Line,
    }
    | {
        type: 'fence',
        fence: Fence,
    }
    | {
        type: 'item',
        marker: ListMarker,
    };

/**
 * How the lines of a block read so far end.
 *
 * This tells whether a line without the block's markers continues it.
 */
type Flow = {
    readonly paragraph: boolean,
    readonly fence: Fence|null,
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

    private static readonly SPACE = ' \t';

    private static readonly DIGITS = '0123456789';

    /**
     * How the lines of a block end before any is read.
     */
    private static readonly START: Flow = {
        paragraph: false,
        fence: null,
    };

    private readonly markdown: string;

    private readonly lines: Line[];

    /**
     * How many blocks hold the lines.
     */
    private readonly depth: number;

    private index = 0;

    /**
     * Whether a blank line lies between two of the blocks read, like two paragraphs.
     */
    private separated = false;

    private constructor(markdown: string, lines: Line[], depth = 0) {
        this.markdown = markdown;
        this.lines = lines;
        this.depth = depth;
    }

    public static parse(input: string): MarkdownNode {
        const nodes = new BlockParser(input, BlockParser.split(input)).parseBlocks();

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
    private parseContent(lines: Line[]): Container {
        if (this.depth === MAX_NESTING) {
            return {
                nodes: this.parseParagraphs(lines),
                separated: false,
            };
        }

        const parser = new BlockParser(this.markdown, lines, this.depth + 1);
        const nodes = parser.parseBlocks();

        return {
            nodes: nodes ?? this.parseParagraphs(lines),
            separated: parser.separated,
        };
    }

    /**
     * Parses the blocks the lines hold, or returns null when they hold none.
     *
     * Without blocks, the text is left to be parsed as paragraphs.
     */
    private parseBlocks(): MarkdownNode[]|null {
        const nodes: MarkdownNode[] = [];
        const text: Line[] = [];

        let found = false;
        let read = false;
        let blank = false;

        while (!this.done) {
            const line = this.current;
            const block = BlockParser.classify(line);

            if (block.type === 'blank') {
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
            const open = text.length > 0 && !BlockParser.isBlankLine(text[text.length - 1]);
            const node = (open ? this.parseUnderlinedHeading(text) : null) ?? this.parseBlock(block, open);

            if (node === null) {
                text.push(line);

                this.advance();

                continue;
            }

            nodes.push(...this.parseParagraphs(text.splice(0)), node);

            found = true;
        }

        if (!found) {
            return null;
        }

        nodes.push(...this.parseParagraphs(text));

        return nodes;
    }

    private parseParagraphs(lines: Line[]): MarkdownNode[] {
        const paragraphs: MarkdownNode[] = [];

        let start = 0;

        for (let index = 0; index <= lines.length; index++) {
            if (index < lines.length && !BlockParser.isBlankLine(lines[index])) {
                continue;
            }

            if (index > start) {
                const paragraph = lines.slice(start, index);
                const node = this.parseInline(paragraph);

                paragraphs.push({
                    type: 'paragraph',
                    children: node.type === 'fragment' ? node.children : [node],
                    source: this.getSource(paragraph[0], paragraph[paragraph.length - 1]),
                });
            }

            start = index + 1;
        }

        return paragraphs;
    }

    private parseBlock(block: Block, interrupting: boolean): MarkdownNode|null {
        const source = this.getSource(this.current);

        switch (block.type) {
            case 'rule':
                this.advance();

                return {
                    type: 'rule',
                    source: source,
                };

            case 'heading':
                this.advance();

                return {
                    type: 'heading',
                    level: block.level,
                    children: this.parseInline([block.content]),
                    source: source,
                };

            case 'quote':
                return this.parseQuote();

            case 'fence':
                return this.parseCodeBlock(block.fence);

            case 'item':
                return this.parseList(block.marker, interrupting);

            default:
                return null;
        }
    }

    /**
     * Parses the paragraph ending the text as a heading, if the current line underlines it.
     */
    private parseUnderlinedHeading(text: Line[]): MarkdownNode<'heading'>|null {
        const level = BlockParser.readUnderline(this.current.content);

        if (level === null) {
            return null;
        }

        let start = text.length;

        while (start > 0 && !BlockParser.isBlankLine(text[start - 1])) {
            start--;
        }

        const lines = text.splice(start);
        const underline = this.current;

        this.advance();

        return {
            type: 'heading',
            level: level,
            children: this.parseInline(lines),
            source: this.getSource(lines[0], underline),
        };
    }

    private parseQuote(): MarkdownNode<'quote'> {
        const start = this.index;
        const lines: Line[] = [];
        let flow = BlockParser.START;

        while (!this.done) {
            const block = BlockParser.classify(this.current);

            // A line without the marker continues the quote's paragraph, unless it starts a block
            if (block.type !== 'quote' && (!flow.paragraph || block.type !== 'text')) {
                break;
            }

            const line = block.type === 'quote' ? block.content : this.current;

            lines.push(line);

            flow = BlockParser.follow(flow, line);

            this.advance();
        }

        return {
            type: 'quote',
            children: this.parseContent(lines).nodes,
            source: this.getSourceSince(start),
        };
    }

    private parseCodeBlock(fence: Fence): MarkdownNode<'codeBlock'> {
        const info = fence.info.trim();
        const language = unescape(info.slice(0, BlockParser.skip(info, BlockParser.SPACE, 0, false)));
        const start = this.index;

        let end = start + 1;

        // A fence that is never closed runs to the end of what holds it
        while (end < this.lines.length && !BlockParser.closes(this.lines[end], fence)) {
            end++;
        }

        this.seek(Math.min(end + 1, this.lines.length));

        return {
            type: 'codeBlock',
            // The content is as indented as it is past the fence's own indentation
            content: BlockParser.join(
                this.lines
                    .slice(start + 1, end)
                    .map(line => BlockParser.dedent(line, fence.indent)),
            ),
            ...(language !== '' ? {language: language} : {}),
            source: this.getSourceSince(start),
        };
    }

    private parseList(first: ListMarker, interrupting: boolean): MarkdownNode|null {
        // A list only interrupts a paragraph where it can't be read as text, so neither when its
        // item is empty nor when it counts from another number than 1
        if (interrupting && (first.content.content === '' || (first.start ?? 1) !== 1)) {
            return null;
        }

        const start = this.index;
        const items: ListItem[] = [];

        for (
            let sibling: ListSibling|null = {marker: first, separated: false};
            sibling !== null;
            sibling = this.findSibling(first.delimiter)
        ) {
            const item = this.parseListItem(sibling.marker);

            items.push({
                ...item,
                separated: item.separated || sibling.separated,
            });
        }

        // A list is loose when a blank line sets its items or the blocks of an item apart, and
        // the text of the items of a tight list reads as it is, rather than as paragraphs
        const tight = items.every(item => !item.separated);
        const nodes = items.map(
            ({node}) => ({
                ...node,
                children: tight
                    ? node.children.flatMap(child => (child.type === 'paragraph' ? child.children : [child]))
                    : node.children,
            }),
        );
        const source = this.getSourceSince(start);

        if (first.start === null) {
            return {
                type: 'unorderedList',
                items: nodes,
                source: source,
            };
        }

        return {
            type: 'orderedList',
            start: first.start,
            items: nodes,
            source: source,
        };
    }

    private parseListItem(marker: ListMarker): ListItem {
        const start = this.index;
        const lines: Line[] = [marker.content];

        this.advance();

        // An item that starts with a blank line can't start with two, so another one ends it
        if (marker.content.content !== '' || this.done || !BlockParser.isBlankLine(this.current)) {
            this.parseListItemLines(marker, lines);
        }

        const content = this.parseContent(lines);

        return {
            node: {
                type: 'listItem',
                children: content.nodes,
                source: this.getSourceSince(start),
            },
            separated: content.separated,
        };
    }

    private parseListItemLines(marker: ListMarker, lines: Line[]): void {
        let flow = BlockParser.follow(BlockParser.START, marker.content);

        while (!this.done) {
            const line = this.current;

            if (BlockParser.isBlankLine(line)) {
                const next = this.findNextContent();

                // Blank lines belong to the item when what follows is indented into it, like
                // another paragraph of the item
                if (next === null || !BlockParser.isIndented(this.lines[next], marker.offset)) {
                    return;
                }

                for (; this.index < next; this.advance()) {
                    const blank = BlockParser.cut(this.current, this.current.content.length);

                    lines.push(blank);

                    flow = BlockParser.follow(flow, blank);
                }

                continue;
            }

            const content = BlockParser.isIndented(line, marker.offset)
                ? BlockParser.dedent(line, marker.offset)
                : null;

            // A line not indented into the item continues its paragraph, unless it starts a block
            if (content === null && (!flow.paragraph || BlockParser.classify(line).type !== 'text')) {
                return;
            }

            lines.push(content ?? line);

            flow = BlockParser.follow(flow, content ?? line);

            this.advance();
        }
    }

    /**
     * Finds the next item of a list with the given delimiter, past any blank lines.
     *
     * Blank lines between items keep them in the same list.
     */
    private findSibling(delimiter: string): ListSibling|null {
        const index = this.findNextContent();

        if (index === null) {
            return null;
        }

        const block = BlockParser.classify(this.lines[index]);

        if (block.type !== 'item' || block.marker.delimiter !== delimiter) {
            return null;
        }

        const separated = index > this.index;

        this.seek(index);

        return {
            marker: block.marker,
            separated: separated,
        };
    }

    private findNextContent(): number|null {
        for (let {index} = this; index < this.lines.length; index++) {
            if (!BlockParser.isBlankLine(this.lines[index])) {
                return index;
            }
        }

        return null;
    }

    /**
     * Parses the inline formatting of the lines, keeping the source of each node as in the input.
     *
     * The spaces the lines start with and the text ends with are left out.
     */
    private parseInline(lines: Line[]): MarkdownNode {
        const positions: number[] = [];

        let text = '';

        lines.forEach((line, index) => {
            const newline = index < lines.length - 1 ? line.newline : '';

            let position = line.start + line.text - line.padding;

            for (const char of line.content.slice(line.text) + newline) {
                text += char;
                positions.push(position);
                position += char.length;
            }
        });

        const end = BlockParser.skipBack(text, BlockParser.SPACE, text.length);

        positions.length -= text.length - end;

        return MarkdownParser.parse(text.slice(0, end), {markdown: this.markdown, positions: positions});
    }

    /**
     * Returns the input from the line at the given index to the end of the last line read.
     */
    private getSourceSince(index: number): string {
        return this.getSource(this.lines[index], this.lines[this.index - 1]);
    }

    /**
     * Returns the input from the start of the first line to the end of the last.
     */
    private getSource(first: Line, last: Line = first): string {
        return this.markdown.slice(first.start, last.start + last.content.length - last.padding);
    }

    /**
     * Tells what block the line starts, if any.
     */
    private static classify(line: Line): Block {
        if (BlockParser.isBlankLine(line)) {
            return {type: 'blank'};
        }

        const {content} = line;

        const index = BlockParser.skipIndentation(content);
        const char = content[index];

        // The run of the character tells the level of a heading and the delimiter of a fence
        const end = char === '#' || char === '`' || char === '~' ? BlockParser.skip(content, char, index) : index;

        switch (char) {
            case '>':
                // The space after the marker is part of it, even when it is part of a tab
                return {
                    type: 'quote',
                    content: BlockParser.dedent(BlockParser.cut(line, index + 1), 1, index + 1),
                };

            case '#':
                if (end - index > 6 || !BlockParser.isSpace(content, end)) {
                    return {type: 'text'};
                }

                return {
                    type: 'heading',
                    level: end - index,
                    content: BlockParser.readHeading(line, end),
                };

            case '`':
            case '~':
                // The info of a fence of backticks can't hold backticks, as inline code can't span lines
                if (end - index < 3 || (char === '`' && content.includes('`', end))) {
                    return {type: 'text'};
                }

                return {
                    type: 'fence',
                    fence: {
                        delimiter: content.slice(index, end),
                        indent: index,
                        info: content.slice(end),
                    },
                };

            case '-':
            case '*':
            case '_':
                if (BlockParser.isRule(content, index)) {
                    return {type: 'rule'};
                }

                break;
        }

        const marker = BlockParser.readListMarker(line, index);

        if (marker === null) {
            return {type: 'text'};
        }

        return {
            type: 'item',
            marker: marker,
        };
    }

    private static readListMarker(line: Line, index: number): ListMarker|null {
        const {content} = line;
        const char = content[index];
        const digits = BlockParser.skip(content, BlockParser.DIGITS, index);

        let end = -1;

        if (char === '-' || char === '*' || char === '+') {
            end = index + 1;
        } else if (digits > index && digits - index <= 9 && (content[digits] === '.' || content[digits] === ')')) {
            end = digits + 1;
        }

        if (end < 0 || !BlockParser.isSpace(content, end)) {
            return null;
        }

        let column = end;

        for (const space of content.slice(end, BlockParser.skip(content, BlockParser.SPACE, end))) {
            column = BlockParser.advanceColumn(column, space);
        }

        const empty = BlockParser.isBlank(content.slice(end));

        // The content starts a column past the marker when empty, or when set as far apart as code
        // would be, which keeps the columns past that one as spaces
        const gap = empty || column - end > BlockParser.TAB_SIZE ? 1 : column - end;

        return {
            delimiter: content[end - 1],
            start: end - index > 1 ? Number.parseInt(content.slice(index, end - 1), 10) : null,
            offset: end + gap,
            content: empty
                ? BlockParser.cut(line, content.length)
                : BlockParser.dedent(BlockParser.cut(line, end), gap, end),
        };
    }

    /**
     * Returns the text of a heading from past its opening hashes.
     *
     * The hashes that may close the heading are left out.
     */
    private static readHeading(line: Line, start: number): Line {
        const {content} = line;
        const end = Math.max(start, BlockParser.skipBack(content, BlockParser.SPACE, content.length));
        const hashes = BlockParser.skipBack(content, '#', end);

        // The closing hashes must be set apart from the text, if any
        const closed = hashes < end && (hashes <= start || BlockParser.isSpace(content, hashes - 1));
        const textEnd = closed ? BlockParser.skipBack(content, BlockParser.SPACE, hashes) : end;

        const text = BlockParser.cut(line, start);
        const length = Math.max(0, textEnd - start);

        return {
            ...text,
            content: text.content.slice(0, length),
            text: Math.min(text.text, length),
        };
    }

    /**
     * Returns the level of the heading the line underlines, or null when it is not an underline.
     */
    private static readUnderline(content: string): number|null {
        const index = BlockParser.skipIndentation(content);
        const char = content[index];

        if (char !== '=' && char !== '-') {
            return null;
        }

        if (!BlockParser.isBlank(content.slice(BlockParser.skip(content, char, index)))) {
            return null;
        }

        return char === '=' ? 1 : 2;
    }

    private static isRule(content: string, index: number): boolean {
        let count = 0;

        for (const char of content.slice(index)) {
            if (char === content[index]) {
                count++;
            } else if (!BlockParser.SPACE.includes(char)) {
                return false;
            }
        }

        return count >= 3;
    }

    private static closes(line: Line, fence: Fence): boolean {
        const block = BlockParser.classify(line);

        return block.type === 'fence'
            && BlockParser.isBlank(block.fence.info)
            && block.fence.delimiter[0] === fence.delimiter[0]
            && block.fence.delimiter.length >= fence.delimiter.length;
    }

    /**
     * Returns how the lines of a block end once the given line is added to them.
     */
    private static follow(flow: Flow, line: Line): Flow {
        if (flow.fence !== null) {
            return BlockParser.closes(line, flow.fence) ? BlockParser.START : flow;
        }

        const block = BlockParser.classify(line);

        switch (block.type) {
            case 'text':
                return {
                    // An underlined paragraph becomes a heading, which ends it
                    paragraph: !flow.paragraph || BlockParser.readUnderline(line.content) === null,
                    fence: null,
                };

            case 'fence':
                return {
                    paragraph: false,
                    fence: block.fence,
                };

            case 'quote':
                return {
                    paragraph: !BlockParser.isBlankLine(block.content),
                    fence: null,
                };

            case 'item':
                return {
                    paragraph: block.marker.content.content !== '',
                    fence: null,
                };

            default:
                return BlockParser.START;
        }
    }

    private static isBlankLine(line: Line): boolean {
        return line.text === line.content.length;
    }

    private static isBlank(text: string): boolean {
        return BlockParser.skip(text, BlockParser.SPACE) === text.length;
    }

    /**
     * Returns the index past the indentation a block may start with.
     *
     * The indentation is up to 3 spaces, as more would make the line code.
     */
    private static skipIndentation(content: string): number {
        let index = 0;

        while (index < 3 && content[index] === ' ') {
            index++;
        }

        return index;
    }

    /**
     * Tells whether the character at the given index is a space or a tab, or past the end.
     */
    private static isSpace(text: string, index: number): boolean {
        return index >= text.length || BlockParser.SPACE.includes(text[index]);
    }

    /**
     * Returns the index past the characters from the given index on that are among the given ones.
     *
     * When told so, it skips the characters that are not among them instead.
     */
    private static skip(text: string, chars: string, index = 0, among = true): number {
        let end = index;

        while (end < text.length && chars.includes(text[end]) === among) {
            end++;
        }

        return end;
    }

    /**
     * Returns the index of the first of the given characters right before the given index.
     */
    private static skipBack(text: string, chars: string, index: number): number {
        let start = index;

        while (start > 0 && chars.includes(text[start - 1])) {
            start--;
        }

        return start;
    }

    /**
     * Returns the column past the given character, with tabs reaching the next tab stop.
     */
    private static advanceColumn(column: number, char: string): number {
        return char === '\t' ? column + BlockParser.TAB_SIZE - (column % BlockParser.TAB_SIZE) : column + 1;
    }

    /**
     * Tells whether the line is indented by the given columns or more, reading no further.
     */
    private static isIndented(line: Line, columns: number): boolean {
        let column = 0;

        for (let index = 0; index < line.text && column < columns; index++) {
            column = BlockParser.advanceColumn(column, line.content[index]);
        }

        return column >= columns;
    }

    /**
     * Removes up to the given columns of indentation from a line starting at the given column.
     *
     * The columns of a tab past them are kept as spaces.
     */
    private static dedent(line: Line, width: number, start = 0): Line {
        const {content} = line;

        let column = start;
        let index = 0;

        while (index < content.length && column - start < width && BlockParser.SPACE.includes(content[index])) {
            const next = BlockParser.advanceColumn(column, content[index]);

            if (next - start > width) {
                return BlockParser.cut(line, index + 1, next - start - width);
            }

            column = next;

            index++;
        }

        return BlockParser.cut(line, index);
    }

    /**
     * Returns the line from the given index of its content on, starting with the given spaces.
     */
    private static cut(line: Line, index: number, padding = 0): Line {
        const content = ' '.repeat(padding) + line.content.slice(index);

        return {
            content: content,
            start: line.start + Math.max(index - line.padding, 0),
            padding: padding + Math.max(line.padding - index, 0),
            // The text is found again only when the cut goes into it, as past markers
            text: index <= line.text ? padding + line.text - index : BlockParser.skip(content, BlockParser.SPACE),
            newline: line.newline,
        };
    }

    private static split(input: string): Line[] {
        const lines: Line[] = [];

        let start = 0;
        let newline: string;

        do {
            let end = start;

            while (end < input.length && input[end] !== '\n' && input[end] !== '\r') {
                end++;
            }

            newline = input.startsWith('\r\n', end) ? '\r\n' : input.charAt(end);

            const content = input.slice(start, end);

            lines.push({
                content: content,
                start: start,
                padding: 0,
                text: BlockParser.skip(content, BlockParser.SPACE),
                newline: newline,
            });

            start = end + newline.length;
        } while (newline !== '');

        return lines;
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
