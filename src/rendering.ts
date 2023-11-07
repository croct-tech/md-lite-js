import {MarkdownNode, MarkdownNodeType} from './ast';
import {parse} from './parsing';

type VisitedMarkdownNodeMap<C> = {
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
    text: {
        content: string,
    },
    image: {
        src: string,
        alt: string,
    },
    link: {
        href: string,
        children: C,
    },
    paragraph: {
        children: C[],
    },
    fragment: {
        children: C[],
    },
};

export type VisitedMarkdownNode<C, T extends MarkdownNodeType> = {
    [K in MarkdownNodeType]: {type: K} & VisitedMarkdownNodeMap<C>[K]
}[T];

export interface MarkdownRenderer<T> {
    bold(node: VisitedMarkdownNode<T, 'bold'>): T;
    italic(node: VisitedMarkdownNode<T, 'italic'>): T;
    strike(node: VisitedMarkdownNode<T, 'strike'>): T;
    code(node: VisitedMarkdownNode<T, 'code'>): T;
    text(node: VisitedMarkdownNode<T, 'text'>): T;
    image(node: VisitedMarkdownNode<T, 'image'>): T;
    link(node: VisitedMarkdownNode<T, 'link'>): T;
    paragraph(node: VisitedMarkdownNode<T, 'paragraph'>): T;
    fragment(node: VisitedMarkdownNode<T, 'fragment'>): T;
}

export function render<T>(markdown: string|MarkdownNode, visitor: MarkdownRenderer<T>): T {
    return visit(typeof markdown === 'string' ? parse(markdown) : markdown, visitor);
}

function visit<T>(node: MarkdownNode, visitor: MarkdownRenderer<T>): T {
    switch (node.type) {
        case 'image':
            return visitor.image(node);

        case 'link':
            return visitor.link({
                type: node.type,
                href: node.href,
                children: visit(node.children, visitor),
            });

        case 'bold':
            return visitor.bold({
                type: node.type,
                children: visit(node.children, visitor),
            });

        case 'italic':
            return visitor.italic({
                type: node.type,
                children: visit(node.children, visitor),
            });

        case 'strike':
            return visitor.strike({
                type: node.type,
                children: visit(node.children, visitor),
            });

        case 'code':
            return visitor.code(node);

        case 'text':
            return visitor.text(node);

        case 'paragraph':
            return visitor.paragraph({
                type: node.type,
                children: node.children.map(child => visit(child, visitor)),
            });

        case 'fragment':
            return visitor.fragment({
                type: node.type,
                children: node.children.map(child => visit(child, visitor)),
            });
    }
}
