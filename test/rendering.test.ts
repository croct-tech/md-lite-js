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
        ],
    };

    it('should render a Markdown tree', () => {
        expect(render(tree, new TestRenderer())).toEqual(tree);
    });

    it('should parse and render a Markdown string', () => {
        expect(render(markdown, new TestRenderer())).toEqual(tree);
    });
});
