import {MarkdownNode} from '../src/ast';
import {MarkdownRenderer, render, VisitedMarkdownNode} from '../src';

describe('A Markdown render function', () => {
    class TestRenderer implements MarkdownRenderer<MarkdownNode> {
        public fragment(node: VisitedMarkdownNode<MarkdownNode, 'fragment'>): MarkdownNode {
            return {
                type: 'fragment',
                source: node.source,
                children: node.children,
            };
        }

        public text(node: VisitedMarkdownNode<MarkdownNode, 'text'>): MarkdownNode {
            return {
                type: 'text',
                source: node.source,
                content: node.content,
            };
        }

        public bold(node: VisitedMarkdownNode<MarkdownNode, 'bold'>): MarkdownNode {
            return {
                type: 'bold',
                source: node.source,
                children: node.children,
            };
        }

        public italic(node: VisitedMarkdownNode<MarkdownNode, 'italic'>): MarkdownNode {
            return {
                type: 'italic',
                source: node.source,
                children: node.children,
            };
        }

        public strike(node: VisitedMarkdownNode<MarkdownNode, 'strike'>): MarkdownNode {
            return {
                type: 'strike',
                source: node.source,
                children: node.children,
            };
        }

        public code(node: VisitedMarkdownNode<MarkdownNode, 'code'>): MarkdownNode {
            return {
                type: 'code',
                source: node.source,
                content: node.content,
            };
        }

        public image(node: VisitedMarkdownNode<MarkdownNode, 'image'>): MarkdownNode {
            return {
                type: 'image',
                source: node.source,
                alt: node.alt,
                src: node.src,
            };
        }

        public link(node: VisitedMarkdownNode<MarkdownNode, 'link'>): MarkdownNode {
            return {
                type: 'link',
                source: node.source,
                href: node.href,
                title: node.title,
                children: node.children,
            };
        }

        public paragraph(node: VisitedMarkdownNode<MarkdownNode, 'paragraph'>): MarkdownNode {
            return {
                type: 'paragraph',
                source: node.source,
                children: node.children,
            };
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
        '[Link with title](https://example.com "Link title")',
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
                        source: '[Link](https://example.com)',
                        href: 'https://example.com',
                        children: {
                            type: 'text',
                            source: 'Link',
                            content: 'Link',
                        },
                    },
                ],
            },
            {
                type: 'paragraph',
                source: '[Link with title](https://example.com "Link title")',
                children: [
                    {
                        type: 'link',
                        source: '[Link with title](https://example.com "Link title")',
                        href: 'https://example.com',
                        title: 'Link title',
                        children: {
                            type: 'text',
                            source: 'Link with title',
                            content: 'Link with title',
                        },
                    },
                ],
            },
        ],
    };

    it('should render a Markdown tree', () => {
        expect(render(tree, new TestRenderer())).toEqual(tree);
    });

    it('should parse and render a Markdown string', () => {
        expect(render(markdown, new TestRenderer())).toEqual(tree);
    });

    it('should assign a global index to each node', () => {
        const input = '**Bold**\n*Italic*\n***Bold and italic***\n';

        const result = render<MarkdownNode>(input, {
            fragment: node => node,
            text: node => node,
            bold: node => node,
            italic: node => node,
            strike: node => node,
            code: node => node,
            image: node => node,
            link: node => node,
            paragraph: node => node,
        });

        expect(result).toEqual({
            index: 10,
            type: 'fragment',
            source: '**Bold**\n*Italic*\n***Bold and italic***\n',
            children: [
                {
                    index: 1,
                    type: 'bold',
                    source: '**Bold**',
                    children: {
                        index: 0,
                        type: 'text',
                        content: 'Bold',
                        source: 'Bold',
                    },
                },
                {
                    index: 2,
                    type: 'text',
                    content: '\n',
                    source: '\n',
                },
                {
                    index: 4,
                    type: 'italic',
                    source: '*Italic*',
                    children: {
                        index: 3,
                        type: 'text',
                        content: 'Italic',
                        source: 'Italic',
                    },
                },
                {
                    index: 5,
                    type: 'text',
                    content: '\n',
                    source: '\n',
                },
                {
                    index: 8,
                    type: 'bold',
                    source: '***Bold and italic***',
                    children: {
                        index: 7,
                        type: 'italic',
                        source: '*Bold and italic*',
                        children: {
                            index: 6,
                            type: 'text',
                            content: 'Bold and italic',
                            source: 'Bold and italic',
                        },
                    },
                },
                {
                    index: 9,
                    type: 'text',
                    content: '\n',
                    source: '\n',
                },
            ],
        });
    });
});
