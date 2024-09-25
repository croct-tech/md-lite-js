import {MarkdownNode} from './ast';

export function parse(markdown: string): MarkdownNode {
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

                const [href, titleWithEndQuote] = this.parseText(')').split(/\s+"/);

                this.match(')');

                return {
                    type: 'link',
                    href: href,
                    title: titleWithEndQuote?.slice(0, -1) /* remove quote character at the end */,
                    children: label,
                    source: this.getSlice(startIndex, this.index),
                };
            }

            default:
                return null;
        }
    }

    private parseText(end: string): string {
        let text = '';

        while (!this.done) {
            if (this.current === '\\' && this.index + 1 < this.length) {
                this.advance();

                text += this.current;

                this.advance();

                continue;
            }

            if (end === '' || this.matches(end) || this.matches(...MarkdownParser.NEWLINE)) {
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
