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

function visit<T>(node: MarkdownNode, visitor: MarkdownRenderer<T>): T {
    switch (node.type) {
        case 'text':
            return visitor.text(node);

        case 'bold':
            return visitor.bold({
                type: node.type,
                children: visit(node.children, visitor),
                source: node.source,
            });

        case 'italic':
            return visitor.italic({
                type: node.type,
                children: visit(node.children, visitor),
                source: node.source,
            });

        case 'strike':
            return visitor.strike({
                type: node.type,
                children: visit(node.children, visitor),
                source: node.source,
            });

        case 'code':
            return visitor.code(node);

        case 'image':
            return visitor.image(node);

        case 'link':
            return visitor.link({
                type: node.type,
                href: node.href,
                children: visit(node.children, visitor),
                source: node.source,
            });

        case 'paragraph':
            return visitor.paragraph({
                type: node.type,
                children: node.children.map(child => visit(child, visitor)),
                source: node.source,
            });

        case 'fragment':
            return visitor.fragment({
                type: node.type,
                children: node.children.map(child => visit(child, visitor)),
                source: node.source,
            });
    }
}
