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

    const tree: MarkdownNode = {
        type: 'fragment',
        children: [
            {
                type: 'paragraph',
                children: [
                    {
                        type: 'bold',
                        children: {
                            type: 'text',
                            content: 'Bold',
                        },
                    },
                ],
            },
            {
                type: 'paragraph',
                children: [
                    {
                        type: 'italic',
                        children: {
                            type: 'text',
                            content: 'Italic',
                        },
                    },
                ],
            },
            {
                type: 'paragraph',
                children: [
                    {
                        type: 'bold',
                        children: {
                            type: 'italic',
                            children: {
                                type: 'text',
                                content: 'Bold and italic',
                            },
                        },
                    },
                ],
            },
            {
                type: 'paragraph',
                children: [
                    {
                        type: 'strike',
                        children: {
                            type: 'text',
                            content: 'Strike',
                        },
                    },
                ],
            },
            {
                type: 'paragraph',
                children: [
                    {
                        type: 'code',
                        content: 'Code',
                    },
                ],
            },
            {
                type: 'paragraph',
                children: [
                    {
                        type: 'image',
                        src: 'https://example.com/image.png',
                        alt: 'Image',
                    },
                ],
            },
            {
                type: 'paragraph',
                children: [
                    {
                        type: 'link',
                        href: 'https://example.com',
                        children: {
                            type: 'text',
                            content: 'Link',
                        },
                    },
                ],
            },
        ],
    };

    const markdown = [
        '**Bold**',
        '*Italic*',
        '***Bold and italic***',
        '~~Strike~~',
        '`Code`',
        '![Image](https://example.com/image.png)',
        '[Link](https://example.com)',
    ].join('\n\n');

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
