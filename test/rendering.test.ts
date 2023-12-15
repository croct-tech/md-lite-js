import {MarkdownNode} from '../src/ast';
import {MarkdownRenderer, render, VisitedMarkdownNode} from '../src';

describe('A Markdown render function', () => {
    class HtmlRenderer implements MarkdownRenderer<string> {
        public fragment(node: VisitedMarkdownNode<string, 'fragment'>): string {
            return node.children.join('');
        }

        public text(node: VisitedMarkdownNode<string, 'text'>): string {
            return node.content;
        }

        public bold(node: VisitedMarkdownNode<string, 'bold'>): string {
            return `<b>${node.children}</b>`;
        }

        public italic(node: VisitedMarkdownNode<string, 'italic'>): string {
            return `<i>${node.children}</i>`;
        }

        public strike(node: VisitedMarkdownNode<string, 'strike'>): string {
            return `<s>${node.children}</s>`;
        }

        public code(node: VisitedMarkdownNode<string, 'code'>): string {
            return `<code>${node.content}</code>`;
        }

        public image(node: VisitedMarkdownNode<string, 'image'>): string {
            return `<img src="${node.src}" alt="${node.alt}">`;
        }

        public link(node: VisitedMarkdownNode<string, 'link'>): string {
            return `<a href="${node.href}">${node.children}</a>`;
        }

        public paragraph(node: VisitedMarkdownNode<string, 'paragraph'>): string {
            return `<p>${node.children.join('')}</p>`;
        }
    }

    const markdown = [
        '**Bold**',
        '*Italic*',
        '***Bold and italic***',
        '~~Strike~~',
        '`Code`',
        '![Image](https://example.com/image.png)',
        '[Link](https://example.com)',
    ].join('\n\n');

    const tree: MarkdownNode = {
        type: 'fragment',
        source: markdown,
        children: [
            {
                type: 'paragraph',
                source: '**Bold**',
                children: [
                    {
                        type: 'bold',
                        source: '**Bold**',
                        children: {
                            type: 'text',
                            source: 'Bold',
                            content: 'Bold',
                        },
                    },
                ],
            },
            {
                type: 'paragraph',
                source: '*Italic*',
                children: [
                    {
                        type: 'italic',
                        source: '*Italic*',
                        children: {
                            source: 'Italic',
                            type: 'text',
                            content: 'Italic',
                        },
                    },
                ],
            },
            {
                type: 'paragraph',
                source: '***Bold and italic***',
                children: [
                    {
                        type: 'bold',
                        source: '***Bold and italic***',
                        children: {
                            type: 'italic',
                            source: '*Bold and italic*',
                            children: {
                                type: 'text',
                                source: 'Bold and italic',
                                content: 'Bold and italic',
                            },
                        },
                    },
                ],
            },
            {
                type: 'paragraph',
                source: '~~Strike~~',
                children: [
                    {
                        type: 'strike',
                        source: '~~Strike~~',
                        children: {
                            type: 'text',
                            source: 'Strike',
                            content: 'Strike',
                        },
                    },
                ],
            },
            {
                type: 'paragraph',
                source: '`Code`',
                children: [
                    {
                        type: 'code',
                        source: '`Code`',
                        content: 'Code',
                    },
                ],
            },
            {
                type: 'paragraph',
                source: '![Image](https://example.com/image.png)',
                children: [
                    {
                        type: 'image',
                        source: '![Image](https://example.com/image.png)',
                        src: 'https://example.com/image.png',
                        alt: 'Image',
                    },
                ],
            },
            {
                type: 'paragraph',
                source: '[Link](https://example.com)',
                children: [
                    {
                        type: 'link',
                        source: '![Link](https://example.com)',
                        href: 'https://example.com',
                        children: {
                            type: 'text',
                            source: 'https://example.com',
                            content: 'Link',
                        },
                    },
                ],
            },
        ],
    };

    const html = [
        '<p><b>Bold</b></p>',
        '<p><i>Italic</i></p>',
        '<p><b><i>Bold and italic</i></b></p>',
        '<p><s>Strike</s></p>',
        '<p><code>Code</code></p>',
        '<p><img src="https://example.com/image.png" alt="Image"></p>',
        '<p><a href="https://example.com">Link</a></p>',
    ].join('');

    it('should render a Markdown tree', () => {
        expect(render(tree, new HtmlRenderer())).toBe(html);
    });

    it('should parse and render a Markdown string', () => {
        expect(render(markdown, new HtmlRenderer())).toBe(html);
    });
});
