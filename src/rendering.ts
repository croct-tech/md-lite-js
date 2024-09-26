import {MarkdownNode, MarkdownNodeType} from './ast';
import {parse} from './parsing';

type VisitedMarkdownNodeMap<C> = {
    text: {
        content: string,
    },
    bold: {
        children: C,
    },
    italic: {
        children: C,
    },
    strike: {
        children: C,
    },
    code: {
        content: string,
    },
    link: {
        href: string,
        title?: string,
        children: C,
    },
    image: {
        src: string,
        alt: string,
    },
    paragraph: {
        children: C[],
    },
    fragment: {
        children: C[],
    },
};

export type VisitedMarkdownNode<C, T extends MarkdownNodeType> = {
    [K in MarkdownNodeType]: {
        type: K,
        index: number,
        source: string,
    } & VisitedMarkdownNodeMap<C>[K]
}[T];

export interface MarkdownRenderer<T> {
    text(node: VisitedMarkdownNode<T, 'text'>): T;
    bold(node: VisitedMarkdownNode<T, 'bold'>): T;
    italic(node: VisitedMarkdownNode<T, 'italic'>): T;
    strike(node: VisitedMarkdownNode<T, 'strike'>): T;
    code(node: VisitedMarkdownNode<T, 'code'>): T;
    link(node: VisitedMarkdownNode<T, 'link'>): T;
    image(node: VisitedMarkdownNode<T, 'image'>): T;
    paragraph(node: VisitedMarkdownNode<T, 'paragraph'>): T;
    fragment(node: VisitedMarkdownNode<T, 'fragment'>): T;
}

export function render<T>(markdown: string|MarkdownNode, visitor: MarkdownRenderer<T>): T {
    return visit(typeof markdown === 'string' ? parse(markdown) : markdown, visitor);
}

function visit<T>(root: MarkdownNode, visitor: MarkdownRenderer<T>): T {
    let index = 0;

    function visitNode(node: MarkdownNode): T {
        switch (node.type) {
            case 'text':
                return visitor.text({
                    ...node,
                    index: index++,
                });

            case 'bold':
                return visitor.bold({
                    type: node.type,
                    children: visitNode(node.children),
                    source: node.source,
                    index: index++,
                });

            case 'italic':
                return visitor.italic({
                    type: node.type,
                    children: visitNode(node.children),
                    index: index++,
                    source: node.source,
                });

            case 'strike':
                return visitor.strike({
                    type: node.type,
                    children: visitNode(node.children),
                    index: index++,
                    source: node.source,
                });

            case 'code':
                return visitor.code({
                    ...node,
                    index: index++,
                });

            case 'image':
                return visitor.image({
                    ...node,
                    index: index++,
                });

            case 'link':
                return visitor.link({
                    type: node.type,
                    href: node.href,
                    title: node.title,
                    children: visitNode(node.children),
                    index: index++,
                    source: node.source,
                });

            case 'paragraph': {
                return visitor.paragraph({
                    type: node.type,
                    children: node.children.map(child => visitNode(child)),
                    index: index++,
                    source: node.source,
                });
            }

            case 'fragment':
                return visitor.fragment({
                    type: node.type,
                    children: node.children.map(child => visitNode(child)),
                    index: index++,
                    source: node.source,
                });
        }
    }

    return visitNode(root);
}
