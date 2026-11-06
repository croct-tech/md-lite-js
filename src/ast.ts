type MarkdownNodeMap = {
    text: {
        content: string,
    },
    bold: {
        children: MarkdownNode,
    },
    italic: {
        children: MarkdownNode,
    },
    strike: {
        children: MarkdownNode,
    },
    code: {
        content: string,
    },
    link: {
        href: string,
        title?: string,
        children: MarkdownNode,
    },
    image: {
        src: string,
        alt: string,
    },
    paragraph: {
        children: MarkdownNode[],
    },
    heading: {
        level: number,
        children: MarkdownNode,
    },
    quote: {
        children: MarkdownNode[],
    },
    list: {
        ordered: boolean,
        start?: number,
        tight: boolean,
        items: Array<MarkdownNode<'listItem'>>,
    },
    listItem: {
        children: MarkdownNode[],
    },
    codeBlock: {
        content: string,
        language?: string,
    },
    rule: Record<never, never>,
    fragment: {
        children: MarkdownNode[],
    },
};

export type MarkdownNodeType = keyof MarkdownNodeMap;

export type MarkdownNode<T extends MarkdownNodeType = MarkdownNodeType> = {
    [K in MarkdownNodeType]: MarkdownNodeMap[K] & {
        type: K,
        source: string,
    }
}[T];
