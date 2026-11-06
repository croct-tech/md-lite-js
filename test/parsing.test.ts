import {parse, unescape} from '../src/parsing';
import {MarkdownNode} from '../src/ast';

describe('A Markdown parser function', () => {
    type ParsingScenario = {
        input: string,
        output: MarkdownNode,
    };

    function getChildren(node: MarkdownNode): MarkdownNode[] {
        if ('items' in node) {
            return node.items;
        }

        return 'children' in node ? [node.children].flat() : [];
    }

    /**
     * Expects the source of the node and of every node it holds to be as it is in the given text.
     */
    function expectVerbatim(node: MarkdownNode, text: string): void {
        expect(text).toContain(node.source);

        for (const child of getChildren(node)) {
            expectVerbatim(child, node.source);
        }
    }

    it.each(Object.entries<ParsingScenario>({
        paragraphs: {
            input: 'First paragraph.\n\nSecond paragraph.',
            output: {
                type: 'fragment',
                source: 'First paragraph.\n\nSecond paragraph.',
                children: [
                    {
                        type: 'paragraph',
                        source: 'First paragraph.',
                        children: [
                            {
                                type: 'text',
                                source: 'First paragraph.',
                                content: 'First paragraph.',
                            },
                        ],
                    },
                    {
                        type: 'paragraph',
                        source: 'Second paragraph.',
                        children: [
                            {
                                type: 'text',
                                source: 'Second paragraph.',
                                content: 'Second paragraph.',
                            },
                        ],
                    },
                ],
            },
        },
        'paragraphs with different newlines': {
            input: 'First\n\nSecond\r\rThird\r\n\r\nFourth',
            output: {
                type: 'fragment',
                source: 'First\n\nSecond\r\rThird\r\n\r\nFourth',
                children: [
                    {
                        type: 'paragraph',
                        source: 'First',
                        children: [
                            {
                                type: 'text',
                                source: 'First',
                                content: 'First',
                            },
                        ],
                    },
                    {
                        type: 'paragraph',
                        source: 'Second',
                        children: [
                            {
                                type: 'text',
                                source: 'Second',
                                content: 'Second',
                            },
                        ],
                    },
                    {
                        type: 'paragraph',
                        source: 'Third',
                        children: [
                            {
                                type: 'text',
                                source: 'Third',
                                content: 'Third',
                            },
                        ],
                    },
                    {
                        type: 'paragraph',
                        source: 'Fourth',
                        children: [
                            {
                                type: 'text',
                                source: 'Fourth',
                                content: 'Fourth',
                            },
                        ],
                    },
                ],
            },
        },
        'paragraphs leading and trailing newlines': {
            input: '\n\n\r\nFirst paragraph.\n\n\r\nSecond paragraph.\n\n\r\n',
            output: {
                type: 'fragment',
                source: '\n\n\r\nFirst paragraph.\n\n\r\nSecond paragraph.\n\n\r\n',
                children: [
                    {
                        type: 'paragraph',
                        source: 'First paragraph.',
                        children: [
                            {
                                type: 'text',
                                source: 'First paragraph.',
                                content: 'First paragraph.',
                            },
                        ],
                    },
                    {
                        type: 'paragraph',
                        source: 'Second paragraph.',
                        children: [
                            {
                                type: 'text',
                                source: 'Second paragraph.',
                                content: 'Second paragraph.',
                            },
                        ],
                    },
                ],
            },
        },
        'empty paragraphs': {
            input: '\n\r\r\n',
            output: {
                type: 'fragment',
                source: '\n\r\r\n',
                children: [],
            },
        },
        'lines ended by a carriage return and a line feed': {
            input: 'First\r\nSecond',
            output: {
                type: 'text',
                source: 'First\r\nSecond',
                content: 'First\r\nSecond',
            },
        },
        'paragraphs multiple newlines': {
            input: '\n\n\nFirst paragraph.\n\n\nSecond paragraph.\n\n\n\n',
            output: {
                type: 'fragment',
                source: '\n\n\nFirst paragraph.\n\n\nSecond paragraph.\n\n\n\n',
                children: [
                    {
                        type: 'paragraph',
                        source: 'First paragraph.',
                        children: [
                            {
                                type: 'text',
                                source: 'First paragraph.',
                                content: 'First paragraph.',
                            },
                        ],
                    },
                    {
                        type: 'paragraph',
                        source: 'Second paragraph.',
                        children: [
                            {
                                type: 'text',
                                source: 'Second paragraph.',
                                content: 'Second paragraph.',
                            },
                        ],
                    },
                ],
            },
        },
        'mixed paragraphs and text': {
            input: [
                '**First**\n_paragraph_',
                '[Second paragraph](ex)',
                '![Third paragraph](ex)',
                'Fourth paragraph',
            ].join('\n\n'),
            output: {
                type: 'fragment',
                source: [
                    '**First**\n_paragraph_',
                    '[Second paragraph](ex)',
                    '![Third paragraph](ex)',
                    'Fourth paragraph',
                ].join('\n\n'),
                children: [
                    {
                        type: 'paragraph',
                        source: '**First**\n_paragraph_',
                        children: [
                            {
                                type: 'bold',
                                source: '**First**',
                                children: {
                                    type: 'text',
                                    source: 'First',
                                    content: 'First',
                                },
                            },
                            {
                                type: 'text',
                                source: '\n',
                                content: '\n',
                            },
                            {
                                type: 'italic',
                                source: '_paragraph_',
                                children: {
                                    type: 'text',
                                    source: 'paragraph',
                                    content: 'paragraph',
                                },
                            },
                        ],
                    },
                    {
                        type: 'paragraph',
                        source: '[Second paragraph](ex)',
                        children: [
                            {
                                type: 'link',
                                source: '[Second paragraph](ex)',
                                href: 'ex',
                                children: {
                                    type: 'text',
                                    source: 'Second paragraph',
                                    content: 'Second paragraph',
                                },
                            },
                        ],
                    },
                    {
                        type: 'paragraph',
                        source: '![Third paragraph](ex)',
                        children: [
                            {
                                type: 'image',
                                source: '![Third paragraph](ex)',
                                src: 'ex',
                                alt: 'Third paragraph',
                            },
                        ],
                    },
                    {
                        type: 'paragraph',
                        source: 'Fourth paragraph',
                        children: [
                            {
                                type: 'text',
                                source: 'Fourth paragraph',
                                content: 'Fourth paragraph',
                            },
                        ],
                    },
                ],
            },
        },
        text: {
            input: 'Hello, world!',
            output: {
                type: 'text',
                source: 'Hello, world!',
                content: 'Hello, world!',
            },
        },
        bold: {
            input: 'Hello, **world**!',
            output: {
                type: 'fragment',
                source: 'Hello, **world**!',
                children: [
                    {
                        type: 'text',
                        source: 'Hello, ',
                        content: 'Hello, ',
                    },
                    {
                        type: 'bold',
                        source: '**world**',
                        children: {
                            type: 'text',
                            source: 'world',
                            content: 'world',
                        },
                    },
                    {
                        type: 'text',
                        source: '!',
                        content: '!',
                    },
                ],
            },
        },
        'bold with start delimited escaped': {
            input: 'Hello, \\**world**!',
            output: {
                type: 'fragment',
                source: 'Hello, \\**world**!',
                children: [
                    {
                        type: 'text',
                        source: 'Hello, \\*',
                        content: 'Hello, *',
                    },
                    {
                        type: 'italic',
                        source: '*world*',
                        children: {
                            type: 'text',
                            source: 'world',
                            content: 'world',
                        },
                    },
                    {
                        type: 'text',
                        source: '*!',
                        content: '*!',
                    },
                ],
            },
        },
        'bold with end delimited escaped': {
            input: 'Hello, **world\\**!',
            output: {
                type: 'fragment',
                source: 'Hello, **world\\**!',
                children: [
                    {
                        type: 'text',
                        source: 'Hello, *',
                        content: 'Hello, *',
                    },
                    {
                        type: 'italic',
                        source: '*world\\**',
                        children: {
                            type: 'text',
                            source: 'world\\*',
                            content: 'world*',
                        },
                    },
                    {
                        type: 'text',
                        source: '!',
                        content: '!',
                    },
                ],
            },
        },
        'bold with escaped asterisk': {
            input: 'Hello, **wor\\*\\*ld**!',
            output: {
                type: 'fragment',
                source: 'Hello, **wor\\*\\*ld**!',
                children: [
                    {
                        type: 'text',
                        source: 'Hello, ',
                        content: 'Hello, ',
                    },
                    {
                        type: 'bold',
                        source: '**wor\\*\\*ld**',
                        children: {
                            type: 'text',
                            source: 'wor\\*\\*ld',
                            content: 'wor**ld',
                        },
                    },
                    {
                        type: 'text',
                        source: '!',
                        content: '!',
                    },
                ],
            },
        },
        'bold with newline': {
            input: 'Hello, **\nworld**!',
            output: {
                type: 'text',
                source: 'Hello, **\nworld**!',
                content: 'Hello, **\nworld**!',
            },
        },
        'bold unbalanced': {
            input: 'Hello, **world***!',
            output: {
                type: 'fragment',
                source: 'Hello, **world***!',
                children: [
                    {
                        type: 'text',
                        source: 'Hello, ',
                        content: 'Hello, ',
                    },
                    {
                        type: 'bold',
                        source: '**world**',
                        children: {
                            type: 'text',
                            source: 'world',
                            content: 'world',
                        },
                    },
                    {
                        type: 'text',
                        source: '*!',
                        content: '*!',
                    },
                ],
            },
        },
        'italic (underscore)': {
            input: 'Hello, _world_!',
            output: {
                type: 'fragment',
                source: 'Hello, _world_!',
                children: [
                    {
                        type: 'text',
                        source: 'Hello, ',
                        content: 'Hello, ',
                    },
                    {
                        type: 'italic',
                        source: '_world_',
                        children: {
                            type: 'text',
                            source: 'world',
                            content: 'world',
                        },
                    },
                    {
                        type: 'text',
                        source: '!',
                        content: '!',
                    },
                ],
            },
        },
        'italic with start delimited escaped (underscore)': {
            input: 'Hello, \\_world_!',
            output: {
                type: 'text',
                source: 'Hello, \\_world_!',
                content: 'Hello, _world_!',
            },
        },
        'italic with end delimited escaped (underscore)': {
            input: 'Hello, _world\\_!',
            output: {
                type: 'text',
                source: 'Hello, _world\\_!',
                content: 'Hello, _world_!',
            },
        },
        'italic with escaped delimiter (underscore)': {
            input: 'Hello, _wor\\_ld_!',
            output: {
                type: 'fragment',
                source: 'Hello, _wor\\_ld_!',
                children: [
                    {
                        type: 'text',
                        source: 'Hello, ',
                        content: 'Hello, ',
                    },
                    {
                        type: 'italic',
                        source: '_wor\\_ld_',
                        children: {
                            type: 'text',
                            source: 'wor\\_ld',
                            content: 'wor_ld',
                        },
                    },
                    {
                        type: 'text',
                        source: '!',
                        content: '!',
                    },
                ],
            },
        },
        'italic with newline (underscore)': {
            input: 'Hello, _\nworld_!',
            output: {
                type: 'text',
                source: 'Hello, _\nworld_!',
                content: 'Hello, _\nworld_!',
            },
        },
        'italic (asterisk)': {
            input: 'Hello, *world*!',
            output: {
                type: 'fragment',
                source: 'Hello, *world*!',
                children: [
                    {
                        type: 'text',
                        source: 'Hello, ',
                        content: 'Hello, ',
                    },
                    {
                        type: 'italic',
                        source: '*world*',
                        children: {
                            type: 'text',
                            source: 'world',
                            content: 'world',
                        },
                    },
                    {
                        type: 'text',
                        source: '!',
                        content: '!',
                    },
                ],
            },
        },
        'italic with start delimited escaped (asterisk)': {
            input: 'Hello, \\*world*!',
            output: {
                type: 'text',
                source: 'Hello, \\*world*!',
                content: 'Hello, *world*!',
            },
        },
        'italic with end delimited escaped (asterisk)': {
            input: 'Hello, *world\\*!',
            output: {
                type: 'text',
                source: 'Hello, *world\\*!',
                content: 'Hello, *world*!',
            },
        },
        'italic with escaped delimiter (asterisk)': {
            input: 'Hello, *wor\\*ld*!',
            output: {
                type: 'fragment',
                source: 'Hello, *wor\\*ld*!',
                children: [
                    {
                        type: 'text',
                        source: 'Hello, ',
                        content: 'Hello, ',
                    },
                    {
                        type: 'italic',
                        source: '*wor\\*ld*',
                        children: {
                            type: 'text',
                            source: 'wor\\*ld',
                            content: 'wor*ld',
                        },
                    },
                    {
                        type: 'text',
                        source: '!',
                        content: '!',
                    },
                ],
            },
        },
        'italic with newline (asterisk)': {
            input: 'Hello, *\nworld*!',
            output: {
                type: 'text',
                source: 'Hello, *\nworld*!',
                content: 'Hello, *\nworld*!',
            },
        },
        'bold and italic': {
            input: 'Hello, ***world***!',
            output: {
                type: 'fragment',
                source: 'Hello, ***world***!',
                children: [
                    {
                        type: 'text',
                        source: 'Hello, ',
                        content: 'Hello, ',
                    },
                    {
                        type: 'bold',
                        source: '***world***',
                        children: {
                            type: 'italic',
                            source: '*world*',
                            children: {
                                type: 'text',
                                source: 'world',
                                content: 'world',
                            },
                        },
                    },
                    {
                        type: 'text',
                        source: '!',
                        content: '!',
                    },
                ],
            },
        },
        strike: {
            input: 'Hello, ~~world~~!',
            output: {
                type: 'fragment',
                source: 'Hello, ~~world~~!',
                children: [
                    {
                        type: 'text',
                        source: 'Hello, ',
                        content: 'Hello, ',
                    },
                    {
                        type: 'strike',
                        source: '~~world~~',
                        children: {
                            type: 'text',
                            source: 'world',
                            content: 'world',
                        },
                    },
                    {
                        type: 'text',
                        source: '!',
                        content: '!',
                    },
                ],
            },
        },
        'strike with start delimited escaped': {
            input: 'Hello, \\~~world~~!',
            output: {
                type: 'text',
                source: 'Hello, \\~~world~~!',
                content: 'Hello, ~~world~~!',
            },
        },
        'strike with end delimited escaped': {
            input: 'Hello, ~~world\\~~!',
            output: {
                type: 'text',
                source: 'Hello, ~~world\\~~!',
                content: 'Hello, ~~world~~!',
            },
        },
        'strike with escaped asterisk': {
            input: 'Hello, ~~wor\\~\\~ld~~!',
            output: {
                type: 'fragment',
                source: 'Hello, ~~wor\\~\\~ld~~!',
                children: [
                    {
                        type: 'text',
                        source: 'Hello, ',
                        content: 'Hello, ',
                    },
                    {
                        type: 'strike',
                        source: '~~wor\\~\\~ld~~',
                        children: {
                            type: 'text',
                            source: 'wor\\~\\~ld',
                            content: 'wor~~ld',
                        },
                    },
                    {
                        type: 'text',
                        source: '!',
                        content: '!',
                    },
                ],
            },
        },
        'strike with newline': {
            input: 'Hello, ~~\nworld~~!',
            output: {
                type: 'text',
                source: 'Hello, ~~\nworld~~!',
                content: 'Hello, ~~\nworld~~!',
            },
        },
        'code (single backtick)': {
            input: 'Hello, `world`!',
            output: {
                type: 'fragment',
                source: 'Hello, `world`!',
                children: [
                    {
                        type: 'text',
                        source: 'Hello, ',
                        content: 'Hello, ',
                    },
                    {
                        type: 'code',
                        source: '`world`',
                        content: 'world',
                    },
                    {
                        type: 'text',
                        source: '!',
                        content: '!',
                    },
                ],
            },
        },
        'code with trailing and leading whitespace (single backtick)': {
            input: 'Hello, ` world `!',
            output: {
                type: 'fragment',
                source: 'Hello, ` world `!',
                children: [
                    {
                        type: 'text',
                        source: 'Hello, ',
                        content: 'Hello, ',
                    },
                    {
                        type: 'code',
                        source: '` world `',
                        content: 'world',
                    },
                    {
                        type: 'text',
                        source: '!',
                        content: '!',
                    },
                ],
            },
        },
        'code with start delimited escaped (single backtick)': {
            input: 'Hello, \\`world`!',
            output: {
                type: 'text',
                source: 'Hello, \\`world`!',
                content: 'Hello, `world`!',
            },
        },
        'code with end delimited escaped (single backtick)': {
            input: 'Hello, `world\\`!',
            output: {
                type: 'text',
                source: 'Hello, `world\\`!',
                content: 'Hello, `world`!',
            },
        },
        'code with escaped backtick (single backtick)': {
            input: 'Hello, `wor\\`ld`!',
            output: {
                type: 'fragment',
                source: 'Hello, `wor\\`ld`!',
                children: [
                    {
                        type: 'text',
                        source: 'Hello, ',
                        content: 'Hello, ',
                    },
                    {
                        type: 'code',
                        source: '`wor\\`ld`',
                        content: 'wor`ld',
                    },
                    {
                        type: 'text',
                        source: '!',
                        content: '!',
                    },
                ],
            },
        },
        'code (double backtick)': {
            input: 'Hello, ``world``!',
            output: {
                type: 'fragment',
                source: 'Hello, ``world``!',
                children: [
                    {
                        type: 'text',
                        source: 'Hello, ',
                        content: 'Hello, ',
                    },
                    {
                        type: 'code',
                        source: '``world``',
                        content: 'world',
                    },
                    {
                        type: 'text',
                        source: '!',
                        content: '!',
                    },
                ],
            },
        },
        'code with trailing and leading whitespace (double backtick)': {
            input: 'Hello, `` world ``!',
            output: {
                type: 'fragment',
                source: 'Hello, `` world ``!',
                children: [
                    {
                        type: 'text',
                        source: 'Hello, ',
                        content: 'Hello, ',
                    },
                    {
                        type: 'code',
                        source: '`` world ``',
                        content: 'world',
                    },
                    {
                        type: 'text',
                        source: '!',
                        content: '!',
                    },
                ],
            },
        },
        'code with start delimited escaped (double backtick)': {
            input: 'Hello, \\``world``!',
            output: {
                type: 'fragment',
                source: 'Hello, \\``world``!',
                children: [
                    {
                        type: 'text',
                        source: 'Hello, \\`',
                        content: 'Hello, `',
                    },
                    {
                        type: 'code',
                        source: '`world`',
                        content: 'world',
                    },
                    {
                        type: 'text',
                        source: '`!',
                        content: '`!',
                    },
                ],
            },
        },
        'code with end delimited escaped (double backtick)': {
            input: 'Hello, ``world\\``!',
            output: {
                type: 'fragment',
                source: 'Hello, ``world\\``!',
                children: [
                    {
                        type: 'text',
                        source: 'Hello, `',
                        content: 'Hello, `',
                    },
                    {
                        type: 'code',
                        source: '`world\\``',
                        content: 'world`',
                    },
                    {
                        type: 'text',
                        source: '!',
                        content: '!',
                    },
                ],
            },
        },
        'code with escaped backtick (double backtick)': {
            input: 'Hello, ``wor\\`ld``!',
            output: {
                type: 'fragment',
                source: 'Hello, ``wor\\`ld``!',
                children: [
                    {
                        type: 'text',
                        source: 'Hello, ',
                        content: 'Hello, ',
                    },
                    {
                        type: 'code',
                        source: '``wor\\`ld``',
                        content: 'wor`ld',
                    },
                    {
                        type: 'text',
                        source: '!',
                        content: '!',
                    },
                ],
            },
        },
        'code with unescaped backtick (double backtick)': {
            input: 'Hello, ``wor`ld``!',
            output: {
                type: 'fragment',
                source: 'Hello, ``wor`ld``!',
                children: [
                    {
                        type: 'text',
                        source: 'Hello, ',
                        content: 'Hello, ',
                    },
                    {
                        type: 'code',
                        source: '``wor`ld``',
                        content: 'wor`ld',
                    },
                    {
                        type: 'text',
                        source: '!',
                        content: '!',
                    },
                ],
            },
        },
        'code with newline': {
            input: 'Hello, `\nworld`!',
            output: {
                type: 'text',
                source: 'Hello, `\nworld`!',
                content: 'Hello, `\nworld`!',
            },
        },
        link: {
            input: 'Hello, [world](image.png)!',
            output: {
                type: 'fragment',
                source: 'Hello, [world](image.png)!',
                children: [
                    {
                        type: 'text',
                        source: 'Hello, ',
                        content: 'Hello, ',
                    },
                    {
                        type: 'link',
                        source: '[world](image.png)',
                        href: 'image.png',
                        children: {
                            type: 'text',
                            source: 'world',
                            content: 'world',
                        },
                    },
                    {
                        type: 'text',
                        source: '!',
                        content: '!',
                    },
                ],
            },
        },
        'link with spaces': {
            input: 'Hello, [world]( image.png )!',
            output: {
                type: 'fragment',
                source: 'Hello, [world]( image.png )!',
                children: [
                    {
                        type: 'text',
                        source: 'Hello, ',
                        content: 'Hello, ',
                    },
                    {
                        type: 'link',
                        source: '[world]( image.png )',
                        href: 'image.png',
                        children: {
                            type: 'text',
                            source: 'world',
                            content: 'world',
                        },
                    },
                    {
                        type: 'text',
                        source: '!',
                        content: '!',
                    },
                ],
            },
        },
        'fenced code (unsupported)': {
            input: 'Hello, ```world```!',
            output: {
                type: 'text',
                source: 'Hello, ```world```!',
                content: 'Hello, ```world```!',
            },
        },
        'fenced code unbalanced (unsupported)': {
            input: 'Hello, ``world```!',
            output: {
                type: 'text',
                source: 'Hello, ``world```!',
                content: 'Hello, ``world```!',
            },
        },
        'link with start delimiter escaped': {
            input: 'Hello, \\[world](image.png)!',
            output: {
                type: 'text',
                source: 'Hello, \\[world](image.png)!',
                content: 'Hello, [world](image.png)!',
            },
        },
        'link with escaped left bracket': {
            input: 'Hello, [wor\\[ld](image.png)!',
            output: {
                type: 'fragment',
                source: 'Hello, [wor\\[ld](image.png)!',
                children: [
                    {
                        type: 'text',
                        source: 'Hello, ',
                        content: 'Hello, ',
                    },
                    {
                        type: 'link',
                        source: '[wor\\[ld](image.png)',
                        href: 'image.png',
                        children: {
                            type: 'text',
                            source: 'wor\\[ld',
                            content: 'wor[ld',
                        },
                    },
                    {
                        type: 'text',
                        source: '!',
                        content: '!',
                    },
                ],
            },
        },
        'link with escaped right bracket': {
            input: 'Hello, [wor\\]ld](image.png)!',
            output: {
                type: 'fragment',
                source: 'Hello, [wor\\]ld](image.png)!',
                children: [
                    {
                        type: 'text',
                        source: 'Hello, ',
                        content: 'Hello, ',
                    },
                    {
                        type: 'link',
                        source: '[wor\\]ld](image.png)',
                        href: 'image.png',
                        children: {
                            type: 'text',
                            source: 'wor\\]ld',
                            content: 'wor]ld',
                        },
                    },
                    {
                        type: 'text',
                        source: '!',
                        content: '!',
                    },
                ],
            },
        },
        'link with escaped left parenthesis': {
            input: 'Hello, [world](https://\\(example.com)!',
            output: {
                type: 'fragment',
                source: 'Hello, [world](https://\\(example.com)!',
                children: [
                    {
                        type: 'text',
                        source: 'Hello, ',
                        content: 'Hello, ',
                    },
                    {
                        type: 'link',
                        source: '[world](https://\\(example.com)',
                        href: 'https://(example.com',
                        children: {
                            type: 'text',
                            source: 'world',
                            content: 'world',
                        },
                    },
                    {
                        type: 'text',
                        source: '!',
                        content: '!',
                    },
                ],
            },
        },
        'link with escaped right parenthesis': {
            input: 'Hello, [world](image.png\\))!',
            output: {
                type: 'fragment',
                source: 'Hello, [world](image.png\\))!',
                children: [
                    {
                        type: 'text',
                        source: 'Hello, ',
                        content: 'Hello, ',
                    },
                    {
                        type: 'link',
                        source: '[world](image.png\\))',
                        href: 'image.png)',
                        children: {
                            type: 'text',
                            source: 'world',
                            content: 'world',
                        },
                    },
                    {
                        type: 'text',
                        source: '!',
                        content: '!',
                    },
                ],
            },
        },
        'link with formatted text': {
            input: 'Hello, [**world**](image.png)!',
            output: {
                type: 'fragment',
                source: 'Hello, [**world**](image.png)!',
                children: [
                    {
                        type: 'text',
                        source: 'Hello, ',
                        content: 'Hello, ',
                    },
                    {
                        type: 'link',
                        source: '[**world**](image.png)',
                        href: 'image.png',
                        children: {
                            type: 'bold',
                            source: '**world**',
                            children: {
                                type: 'text',
                                source: 'world',
                                content: 'world',
                            },
                        },
                    },
                    {
                        type: 'text',
                        source: '!',
                        content: '!',
                    },
                ],
            },
        },
        'link with title': {
            input: 'Hello, [world](image.png "The world")!',
            output: {
                type: 'fragment',
                source: 'Hello, [world](image.png "The world")!',
                children: [
                    {
                        type: 'text',
                        source: 'Hello, ',
                        content: 'Hello, ',
                    },
                    {
                        type: 'link',
                        source: '[world](image.png "The world")',
                        href: 'image.png',
                        title: 'The world',
                        children: {
                            type: 'text',
                            source: 'world',
                            content: 'world',
                        },
                    },
                    {
                        type: 'text',
                        source: '!',
                        content: '!',
                    },
                ],
            },
        },
        'link with title and escaped quote': {
            input: 'Hello, [world](image.png "The \\"world\\"")!',
            output: {
                type: 'fragment',
                source: 'Hello, [world](image.png "The \\"world\\"")!',
                children: [
                    {
                        type: 'text',
                        source: 'Hello, ',
                        content: 'Hello, ',
                    },
                    {
                        type: 'link',
                        source: '[world](image.png "The \\"world\\"")',
                        href: 'image.png',
                        title: 'The "world"',
                        children: {
                            type: 'text',
                            source: 'world',
                            content: 'world',
                        },
                    },
                    {
                        type: 'text',
                        source: '!',
                        content: '!',
                    },
                ],
            },
        },
        image: {
            input: 'Hello, ![world](image.png)!',
            output: {
                type: 'fragment',
                source: 'Hello, ![world](image.png)!',
                children: [
                    {
                        type: 'text',
                        source: 'Hello, ',
                        content: 'Hello, ',
                    },
                    {
                        type: 'image',
                        source: '![world](image.png)',
                        src: 'image.png',
                        alt: 'world',
                    },
                    {
                        type: 'text',
                        source: '!',
                        content: '!',
                    },
                ],
            },
        },
        'image with start delimiter escaped': {
            input: 'Hello, \\![world](image.png)!',
            output: {
                type: 'fragment',
                source: 'Hello, \\![world](image.png)!',
                children: [
                    {
                        type: 'text',
                        source: 'Hello, \\!',
                        content: 'Hello, !',
                    },
                    {
                        type: 'link',
                        source: '[world](image.png)',
                        href: 'image.png',
                        children: {
                            type: 'text',
                            source: 'world',
                            content: 'world',
                        },
                    },
                    {
                        type: 'text',
                        source: '!',
                        content: '!',
                    },
                ],
            },
        },
        'image with escaped left bracket': {
            input: 'Hello, ![wor\\[ld](image.png)!',
            output: {
                type: 'fragment',
                source: 'Hello, ![wor\\[ld](image.png)!',
                children: [
                    {
                        type: 'text',
                        source: 'Hello, ',
                        content: 'Hello, ',
                    },
                    {
                        type: 'image',
                        source: '![wor\\[ld](image.png)',
                        src: 'image.png',
                        alt: 'wor[ld',
                    },
                    {
                        type: 'text',
                        source: '!',
                        content: '!',
                    },
                ],
            },
        },
        'image with escaped right bracket': {
            input: 'Hello, ![wor\\]ld](image.png)!',
            output: {
                type: 'fragment',
                source: 'Hello, ![wor\\]ld](image.png)!',
                children: [
                    {
                        type: 'text',
                        source: 'Hello, ',
                        content: 'Hello, ',
                    },
                    {
                        type: 'image',
                        source: '![wor\\]ld](image.png)',
                        src: 'image.png',
                        alt: 'wor]ld',
                    },
                    {
                        type: 'text',
                        source: '!',
                        content: '!',
                    },
                ],
            },
        },
        'image with escaped left parenthesis': {
            input: 'Hello, ![world](https://\\(example.com)!',
            output: {
                type: 'fragment',
                source: 'Hello, ![world](https://\\(example.com)!',
                children: [
                    {
                        type: 'text',
                        source: 'Hello, ',
                        content: 'Hello, ',
                    },
                    {
                        type: 'image',
                        source: '![world](https://\\(example.com)',
                        src: 'https://(example.com',
                        alt: 'world',
                    },
                    {
                        type: 'text',
                        source: '!',
                        content: '!',
                    },
                ],
            },
        },
        'image with escaped right parenthesis': {
            input: 'Hello, ![world](image.png\\))!',
            output: {
                type: 'fragment',
                source: 'Hello, ![world](image.png\\))!',
                children: [
                    {
                        type: 'text',
                        source: 'Hello, ',
                        content: 'Hello, ',
                    },
                    {
                        type: 'image',
                        source: '![world](image.png\\))',
                        src: 'image.png)',
                        alt: 'world',
                    },
                    {
                        type: 'text',
                        source: '!',
                        content: '!',
                    },
                ],
            },
        },
        'image with formatted text': {
            input: 'Hello, ![**world**](image.png)!',
            output: {
                type: 'fragment',
                source: 'Hello, ![**world**](image.png)!',
                children: [
                    {
                        type: 'text',
                        source: 'Hello, ',
                        content: 'Hello, ',
                    },
                    {
                        type: 'image',
                        source: '![**world**](image.png)',
                        src: 'image.png',
                        alt: '**world**',
                    },
                    {
                        type: 'text',
                        source: '!',
                        content: '!',
                    },
                ],
            },
        },
        'link with image': {
            input: 'Hello, [![world](image.png)](https://example.com)!',
            output: {
                type: 'fragment',
                source: 'Hello, [![world](image.png)](https://example.com)!',
                children: [
                    {
                        type: 'text',
                        source: 'Hello, ',
                        content: 'Hello, ',
                    },
                    {
                        type: 'link',
                        source: '[![world](image.png)](https://example.com)',
                        href: 'https://example.com',
                        children: {
                            type: 'image',
                            source: '![world](image.png)',
                            src: 'image.png',
                            alt: 'world',
                        },
                    },
                    {
                        type: 'text',
                        source: '!',
                        content: '!',
                    },
                ],
            },
        },
        'mixed formatting': {
            input: 'Hello, **_~~`[world](image.png)`~~_**!',
            output: {
                type: 'fragment',
                source: 'Hello, **_~~`[world](image.png)`~~_**!',
                children: [
                    {
                        type: 'text',
                        source: 'Hello, ',
                        content: 'Hello, ',
                    },
                    {
                        type: 'bold',
                        source: '**_~~`[world](image.png)`~~_**',
                        children: {
                            type: 'italic',
                            source: '_~~`[world](image.png)`~~_',
                            children: {
                                type: 'strike',
                                source: '~~`[world](image.png)`~~',
                                children: {
                                    type: 'code',
                                    source: '`[world](image.png)`',
                                    content: '[world](image.png)',
                                },
                            },
                        },
                    },
                    {
                        type: 'text',
                        source: '!',
                        content: '!',
                    },
                ],
            },
        },
        'image without its source': {
            input: '![alt]',
            output: {
                type: 'text',
                source: '![alt]',
                content: '![alt]',
            },
        },
        'image with an unclosed source': {
            input: '![alt](src',
            output: {
                type: 'text',
                source: '![alt](src',
                content: '![alt](src',
            },
        },
        'link without its target': {
            input: '[label]',
            output: {
                type: 'text',
                source: '[label]',
                content: '[label]',
            },
        },
        'link with an unclosed title': {
            input: '[label](href "title',
            output: {
                type: 'text',
                source: '[label](href "title',
                content: '[label](href "title',
            },
        },
        'link with an unclosed target': {
            input: '[label](href "title"',
            output: {
                type: 'text',
                source: '[label](href "title"',
                content: '[label](href "title"',
            },
        },
        'many unclosed brackets as text': {
            input: '['.repeat(100),
            output: {
                type: 'text',
                source: '['.repeat(100),
                content: '['.repeat(100),
            },
        },
        'many unclosed links as text': {
            input: '[a](b '.repeat(100),
            output: {
                type: 'text',
                source: '[a](b '.repeat(100),
                content: '[a](b '.repeat(100),
            },
        },
        'headings of every level': {
            input: '# One\n\n## Two\n\n### Three\n\n#### Four\n\n##### Five\n\n###### Six',
            output: {
                type: 'fragment',
                source: '# One\n\n## Two\n\n### Three\n\n#### Four\n\n##### Five\n\n###### Six',
                children: [
                    {
                        type: 'heading',
                        source: '# One',
                        level: 1,
                        children: {
                            type: 'text',
                            source: 'One',
                            content: 'One',
                        },
                    },
                    {
                        type: 'heading',
                        source: '## Two',
                        level: 2,
                        children: {
                            type: 'text',
                            source: 'Two',
                            content: 'Two',
                        },
                    },
                    {
                        type: 'heading',
                        source: '### Three',
                        level: 3,
                        children: {
                            type: 'text',
                            source: 'Three',
                            content: 'Three',
                        },
                    },
                    {
                        type: 'heading',
                        source: '#### Four',
                        level: 4,
                        children: {
                            type: 'text',
                            source: 'Four',
                            content: 'Four',
                        },
                    },
                    {
                        type: 'heading',
                        source: '##### Five',
                        level: 5,
                        children: {
                            type: 'text',
                            source: 'Five',
                            content: 'Five',
                        },
                    },
                    {
                        type: 'heading',
                        source: '###### Six',
                        level: 6,
                        children: {
                            type: 'text',
                            source: 'Six',
                            content: 'Six',
                        },
                    },
                ],
            },
        },
        'a heading with formatting and closing hashes': {
            input: '## A **bold** heading ##',
            output: {
                type: 'heading',
                source: '## A **bold** heading ##',
                level: 2,
                children: {
                    type: 'fragment',
                    source: 'A **bold** heading',
                    children: [
                        {
                            type: 'text',
                            source: 'A ',
                            content: 'A ',
                        },
                        {
                            type: 'bold',
                            source: '**bold**',
                            children: {
                                type: 'text',
                                source: 'bold',
                                content: 'bold',
                            },
                        },
                        {
                            type: 'text',
                            source: ' heading',
                            content: ' heading',
                        },
                    ],
                },
            },
        },
        'an empty heading': {
            input: '#',
            output: {
                type: 'heading',
                source: '#',
                level: 1,
                children: {
                    type: 'fragment',
                    source: '',
                    children: [],
                },
            },
        },
        'a heading of closing hashes only': {
            input: '# #',
            output: {
                type: 'heading',
                source: '# #',
                level: 1,
                children: {
                    type: 'fragment',
                    source: '',
                    children: [],
                },
            },
        },
        'a hash without a space as text': {
            input: '#hashtag',
            output: {
                type: 'text',
                source: '#hashtag',
                content: '#hashtag',
            },
        },
        'seven hashes as text': {
            input: '####### Seven',
            output: {
                type: 'text',
                source: '####### Seven',
                content: '####### Seven',
            },
        },
        'an escaped hash as text': {
            input: '\\# Not a heading',
            output: {
                type: 'text',
                source: '\\# Not a heading',
                content: '# Not a heading',
            },
        },
        'an underlined heading of level 1': {
            input: 'Title\n===',
            output: {
                type: 'heading',
                source: 'Title\n===',
                level: 1,
                children: {
                    type: 'text',
                    source: 'Title',
                    content: 'Title',
                },
            },
        },
        'an underlined heading of level 2': {
            input: 'Title\n---',
            output: {
                type: 'heading',
                source: 'Title\n---',
                level: 2,
                children: {
                    type: 'text',
                    source: 'Title',
                    content: 'Title',
                },
            },
        },
        'an underlined heading of many lines': {
            input: 'First line\n  second line\n---',
            output: {
                type: 'heading',
                source: 'First line\n  second line\n---',
                level: 2,
                children: {
                    type: 'text',
                    source: 'First line\n  second line',
                    content: 'First line\nsecond line',
                },
            },
        },
        'a rule after a blank line rather than an underline': {
            input: 'Text\n\n---',
            output: {
                type: 'fragment',
                source: 'Text\n\n---',
                children: [
                    {
                        type: 'paragraph',
                        source: 'Text',
                        children: [
                            {
                                type: 'text',
                                source: 'Text',
                                content: 'Text',
                            },
                        ],
                    },
                    {
                        type: 'rule',
                        source: '---',
                    },
                ],
            },
        },
        'a quote': {
            input: '> Quoted **text**\n> on two lines',
            output: {
                type: 'quote',
                source: '> Quoted **text**\n> on two lines',
                children: [
                    {
                        type: 'paragraph',
                        source: 'Quoted **text**\n> on two lines',
                        children: [
                            {
                                type: 'text',
                                source: 'Quoted ',
                                content: 'Quoted ',
                            },
                            {
                                type: 'bold',
                                source: '**text**',
                                children: {
                                    type: 'text',
                                    source: 'text',
                                    content: 'text',
                                },
                            },
                            {
                                type: 'text',
                                source: '\n> on two lines',
                                content: '\non two lines',
                            },
                        ],
                    },
                ],
            },
        },
        'a quote of equals signs continued by a lazy line': {
            input: '> ===\nLazy',
            output: {
                type: 'quote',
                source: '> ===\nLazy',
                children: [
                    {
                        type: 'paragraph',
                        source: '===\nLazy',
                        children: [
                            {
                                type: 'text',
                                source: '===\nLazy',
                                content: '===\nLazy',
                            },
                        ],
                    },
                ],
            },
        },
        'a quote with paragraphs and a list': {
            input: '> First\n>\n> - One\n> - Two',
            output: {
                type: 'quote',
                source: '> First\n>\n> - One\n> - Two',
                children: [
                    {
                        type: 'paragraph',
                        source: 'First',
                        children: [
                            {
                                type: 'text',
                                source: 'First',
                                content: 'First',
                            },
                        ],
                    },
                    {
                        type: 'unorderedList',
                        source: '- One\n> - Two',
                        items: [
                            {
                                type: 'listItem',
                                source: '- One',
                                children: [
                                    {
                                        type: 'text',
                                        source: 'One',
                                        content: 'One',
                                    },
                                ],
                            },
                            {
                                type: 'listItem',
                                source: '- Two',
                                children: [
                                    {
                                        type: 'text',
                                        source: 'Two',
                                        content: 'Two',
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        },
        'a quote in a quote': {
            input: '> > Inner',
            output: {
                type: 'quote',
                source: '> > Inner',
                children: [
                    {
                        type: 'quote',
                        source: '> Inner',
                        children: [
                            {
                                type: 'paragraph',
                                source: 'Inner',
                                children: [
                                    {
                                        type: 'text',
                                        source: 'Inner',
                                        content: 'Inner',
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        },
        'a quote continued by a line without its marker': {
            input: '> Quoted\ncontinued',
            output: {
                type: 'quote',
                source: '> Quoted\ncontinued',
                children: [
                    {
                        type: 'paragraph',
                        source: 'Quoted\ncontinued',
                        children: [
                            {
                                type: 'text',
                                source: 'Quoted\ncontinued',
                                content: 'Quoted\ncontinued',
                            },
                        ],
                    },
                ],
            },
        },
        'a quote ended by a block': {
            input: '> Quoted\n- One',
            output: {
                type: 'fragment',
                source: '> Quoted\n- One',
                children: [
                    {
                        type: 'quote',
                        source: '> Quoted',
                        children: [
                            {
                                type: 'paragraph',
                                source: 'Quoted',
                                children: [
                                    {
                                        type: 'text',
                                        source: 'Quoted',
                                        content: 'Quoted',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: 'unorderedList',
                        source: '- One',
                        items: [
                            {
                                type: 'listItem',
                                source: '- One',
                                children: [
                                    {
                                        type: 'text',
                                        source: 'One',
                                        content: 'One',
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        },
        'a quote ended by a rule': {
            input: '> Quoted\n---',
            output: {
                type: 'fragment',
                source: '> Quoted\n---',
                children: [
                    {
                        type: 'quote',
                        source: '> Quoted',
                        children: [
                            {
                                type: 'paragraph',
                                source: 'Quoted',
                                children: [
                                    {
                                        type: 'text',
                                        source: 'Quoted',
                                        content: 'Quoted',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: 'rule',
                        source: '---',
                    },
                ],
            },
        },
        'a code block never closed in a quote': {
            input: '> ```\n> code\n\nAfter',
            output: {
                type: 'fragment',
                source: '> ```\n> code\n\nAfter',
                children: [
                    {
                        type: 'quote',
                        source: '> ```\n> code',
                        children: [
                            {
                                type: 'codeBlock',
                                source: '```\n> code',
                                content: 'code',
                            },
                        ],
                    },
                    {
                        type: 'paragraph',
                        source: 'After',
                        children: [
                            {
                                type: 'text',
                                source: 'After',
                                content: 'After',
                            },
                        ],
                    },
                ],
            },
        },
        'an unordered list': {
            input: '- One\n- **Two**',
            output: {
                type: 'unorderedList',
                source: '- One\n- **Two**',
                items: [
                    {
                        type: 'listItem',
                        source: '- One',
                        children: [
                            {
                                type: 'text',
                                source: 'One',
                                content: 'One',
                            },
                        ],
                    },
                    {
                        type: 'listItem',
                        source: '- **Two**',
                        children: [
                            {
                                type: 'bold',
                                source: '**Two**',
                                children: {
                                    type: 'text',
                                    source: 'Two',
                                    content: 'Two',
                                },
                            },
                        ],
                    },
                ],
            },
        },
        'lists with different bullets': {
            input: '- One\n* Two\n+ Three',
            output: {
                type: 'fragment',
                source: '- One\n* Two\n+ Three',
                children: [
                    {
                        type: 'unorderedList',
                        source: '- One',
                        items: [
                            {
                                type: 'listItem',
                                source: '- One',
                                children: [
                                    {
                                        type: 'text',
                                        source: 'One',
                                        content: 'One',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: 'unorderedList',
                        source: '* Two',
                        items: [
                            {
                                type: 'listItem',
                                source: '* Two',
                                children: [
                                    {
                                        type: 'text',
                                        source: 'Two',
                                        content: 'Two',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: 'unorderedList',
                        source: '+ Three',
                        items: [
                            {
                                type: 'listItem',
                                source: '+ Three',
                                children: [
                                    {
                                        type: 'text',
                                        source: 'Three',
                                        content: 'Three',
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        },
        'lists with different delimiters': {
            input: '1. One\n2) Two',
            output: {
                type: 'fragment',
                source: '1. One\n2) Two',
                children: [
                    {
                        type: 'orderedList',
                        source: '1. One',
                        start: 1,
                        items: [
                            {
                                type: 'listItem',
                                source: '1. One',
                                children: [
                                    {
                                        type: 'text',
                                        source: 'One',
                                        content: 'One',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: 'orderedList',
                        source: '2) Two',
                        start: 2,
                        items: [
                            {
                                type: 'listItem',
                                source: '2) Two',
                                children: [
                                    {
                                        type: 'text',
                                        source: 'Two',
                                        content: 'Two',
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        },
        'an ordered list': {
            input: '3. Three\n4. Four',
            output: {
                type: 'orderedList',
                source: '3. Three\n4. Four',
                start: 3,
                items: [
                    {
                        type: 'listItem',
                        source: '3. Three',
                        children: [
                            {
                                type: 'text',
                                source: 'Three',
                                content: 'Three',
                            },
                        ],
                    },
                    {
                        type: 'listItem',
                        source: '4. Four',
                        children: [
                            {
                                type: 'text',
                                source: 'Four',
                                content: 'Four',
                            },
                        ],
                    },
                ],
            },
        },
        'a nested list': {
            input: '- One\n    - Inner\n    - Inner too\n- Two',
            output: {
                type: 'unorderedList',
                source: '- One\n    - Inner\n    - Inner too\n- Two',
                items: [
                    {
                        type: 'listItem',
                        source: '- One\n    - Inner\n    - Inner too',
                        children: [
                            {
                                type: 'text',
                                source: 'One',
                                content: 'One',
                            },
                            {
                                type: 'unorderedList',
                                source: '  - Inner\n    - Inner too',
                                items: [
                                    {
                                        type: 'listItem',
                                        source: '  - Inner',
                                        children: [
                                            {
                                                type: 'text',
                                                source: 'Inner',
                                                content: 'Inner',
                                            },
                                        ],
                                    },
                                    {
                                        type: 'listItem',
                                        source: '  - Inner too',
                                        children: [
                                            {
                                                type: 'text',
                                                source: 'Inner too',
                                                content: 'Inner too',
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: 'listItem',
                        source: '- Two',
                        children: [
                            {
                                type: 'text',
                                source: 'Two',
                                content: 'Two',
                            },
                        ],
                    },
                ],
            },
        },
        'a loose list': {
            input: '- One\n\n- Two',
            output: {
                type: 'unorderedList',
                source: '- One\n\n- Two',
                items: [
                    {
                        type: 'listItem',
                        source: '- One',
                        children: [
                            {
                                type: 'paragraph',
                                source: 'One',
                                children: [
                                    {
                                        type: 'text',
                                        source: 'One',
                                        content: 'One',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: 'listItem',
                        source: '- Two',
                        children: [
                            {
                                type: 'paragraph',
                                source: 'Two',
                                children: [
                                    {
                                        type: 'text',
                                        source: 'Two',
                                        content: 'Two',
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        },
        'a loose list item': {
            input: '- First\n\n  Still first\n- Second',
            output: {
                type: 'unorderedList',
                source: '- First\n\n  Still first\n- Second',
                items: [
                    {
                        type: 'listItem',
                        source: '- First\n\n  Still first',
                        children: [
                            {
                                type: 'paragraph',
                                source: 'First',
                                children: [
                                    {
                                        type: 'text',
                                        source: 'First',
                                        content: 'First',
                                    },
                                ],
                            },
                            {
                                type: 'paragraph',
                                source: 'Still first',
                                children: [
                                    {
                                        type: 'text',
                                        source: 'Still first',
                                        content: 'Still first',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: 'listItem',
                        source: '- Second',
                        children: [
                            {
                                type: 'paragraph',
                                source: 'Second',
                                children: [
                                    {
                                        type: 'text',
                                        source: 'Second',
                                        content: 'Second',
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        },
        'a loose list in a tight one': {
            input: '- One\n  - Inner\n\n  - Inner too',
            output: {
                type: 'unorderedList',
                source: '- One\n  - Inner\n\n  - Inner too',
                items: [
                    {
                        type: 'listItem',
                        source: '- One\n  - Inner\n\n  - Inner too',
                        children: [
                            {
                                type: 'text',
                                source: 'One',
                                content: 'One',
                            },
                            {
                                type: 'unorderedList',
                                source: '- Inner\n\n  - Inner too',
                                items: [
                                    {
                                        type: 'listItem',
                                        source: '- Inner',
                                        children: [
                                            {
                                                type: 'paragraph',
                                                source: 'Inner',
                                                children: [
                                                    {
                                                        type: 'text',
                                                        source: 'Inner',
                                                        content: 'Inner',
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                    {
                                        type: 'listItem',
                                        source: '- Inner too',
                                        children: [
                                            {
                                                type: 'paragraph',
                                                source: 'Inner too',
                                                children: [
                                                    {
                                                        type: 'text',
                                                        source: 'Inner too',
                                                        content: 'Inner too',
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        },
        'a list item continued on the next line': {
            input: '- First\ncontinued\n- Second',
            output: {
                type: 'unorderedList',
                source: '- First\ncontinued\n- Second',
                items: [
                    {
                        type: 'listItem',
                        source: '- First\ncontinued',
                        children: [
                            {
                                type: 'text',
                                source: 'First\ncontinued',
                                content: 'First\ncontinued',
                            },
                        ],
                    },
                    {
                        type: 'listItem',
                        source: '- Second',
                        children: [
                            {
                                type: 'text',
                                source: 'Second',
                                content: 'Second',
                            },
                        ],
                    },
                ],
            },
        },
        'an empty list item': {
            input: '-\n- Second',
            output: {
                type: 'unorderedList',
                source: '-\n- Second',
                items: [
                    {
                        type: 'listItem',
                        source: '-',
                        children: [],
                    },
                    {
                        type: 'listItem',
                        source: '- Second',
                        children: [
                            {
                                type: 'text',
                                source: 'Second',
                                content: 'Second',
                            },
                        ],
                    },
                ],
            },
        },
        'a list item starting with a blank line': {
            input: '-\n  First',
            output: {
                type: 'unorderedList',
                source: '-\n  First',
                items: [
                    {
                        type: 'listItem',
                        source: '-\n  First',
                        children: [
                            {
                                type: 'text',
                                source: 'First',
                                content: 'First',
                            },
                        ],
                    },
                ],
            },
        },
        'a list item starting with two blank lines': {
            input: '-\n\n  After',
            output: {
                type: 'fragment',
                source: '-\n\n  After',
                children: [
                    {
                        type: 'unorderedList',
                        source: '-',
                        items: [
                            {
                                type: 'listItem',
                                source: '-',
                                children: [],
                            },
                        ],
                    },
                    {
                        type: 'paragraph',
                        source: '  After',
                        children: [
                            {
                                type: 'text',
                                source: 'After',
                                content: 'After',
                            },
                        ],
                    },
                ],
            },
        },
        'a list item set far from its marker': {
            input: '-     Far',
            output: {
                type: 'unorderedList',
                source: '-     Far',
                items: [
                    {
                        type: 'listItem',
                        source: '-     Far',
                        children: [
                            {
                                type: 'text',
                                source: 'Far',
                                content: 'Far',
                            },
                        ],
                    },
                ],
            },
        },
        'list items indented with tabs': {
            input: '-\tOne\n\tcontinued\n- Two\n\t- Inner',
            output: {
                type: 'unorderedList',
                source: '-\tOne\n\tcontinued\n- Two\n\t- Inner',
                items: [
                    {
                        type: 'listItem',
                        source: '-\tOne\n\tcontinued',
                        children: [
                            {
                                type: 'text',
                                source: 'One\n\tcontinued',
                                content: 'One\ncontinued',
                            },
                        ],
                    },
                    {
                        type: 'listItem',
                        source: '- Two\n\t- Inner',
                        children: [
                            {
                                type: 'text',
                                source: 'Two',
                                content: 'Two',
                            },
                            {
                                type: 'unorderedList',
                                source: '- Inner',
                                items: [
                                    {
                                        type: 'listItem',
                                        source: '- Inner',
                                        children: [
                                            {
                                                type: 'text',
                                                source: 'Inner',
                                                content: 'Inner',
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        },
        'a list after a paragraph': {
            input: 'Intro\n- One\n- Two',
            output: {
                type: 'fragment',
                source: 'Intro\n- One\n- Two',
                children: [
                    {
                        type: 'paragraph',
                        source: 'Intro',
                        children: [
                            {
                                type: 'text',
                                source: 'Intro',
                                content: 'Intro',
                            },
                        ],
                    },
                    {
                        type: 'unorderedList',
                        source: '- One\n- Two',
                        items: [
                            {
                                type: 'listItem',
                                source: '- One',
                                children: [
                                    {
                                        type: 'text',
                                        source: 'One',
                                        content: 'One',
                                    },
                                ],
                            },
                            {
                                type: 'listItem',
                                source: '- Two',
                                children: [
                                    {
                                        type: 'text',
                                        source: 'Two',
                                        content: 'Two',
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        },
        'a number in a paragraph as text': {
            input: 'The year was\n2026. Then came',
            output: {
                type: 'text',
                source: 'The year was\n2026. Then came',
                content: 'The year was\n2026. Then came',
            },
        },
        'an empty item in a paragraph as text': {
            input: 'Before\n*\nAfter',
            output: {
                type: 'text',
                source: 'Before\n*\nAfter',
                content: 'Before\n*\nAfter',
            },
        },
        'an ordered list from any number after a blank line': {
            input: 'Intro\n\n2. Two',
            output: {
                type: 'fragment',
                source: 'Intro\n\n2. Two',
                children: [
                    {
                        type: 'paragraph',
                        source: 'Intro',
                        children: [
                            {
                                type: 'text',
                                source: 'Intro',
                                content: 'Intro',
                            },
                        ],
                    },
                    {
                        type: 'orderedList',
                        source: '2. Two',
                        start: 2,
                        items: [
                            {
                                type: 'listItem',
                                source: '2. Two',
                                children: [
                                    {
                                        type: 'text',
                                        source: 'Two',
                                        content: 'Two',
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        },
        'a list before a paragraph': {
            input: '- One\n- Two\n\nAfter',
            output: {
                type: 'fragment',
                source: '- One\n- Two\n\nAfter',
                children: [
                    {
                        type: 'unorderedList',
                        source: '- One\n- Two',
                        items: [
                            {
                                type: 'listItem',
                                source: '- One',
                                children: [
                                    {
                                        type: 'text',
                                        source: 'One',
                                        content: 'One',
                                    },
                                ],
                            },
                            {
                                type: 'listItem',
                                source: '- Two',
                                children: [
                                    {
                                        type: 'text',
                                        source: 'Two',
                                        content: 'Two',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: 'paragraph',
                        source: 'After',
                        children: [
                            {
                                type: 'text',
                                source: 'After',
                                content: 'After',
                            },
                        ],
                    },
                ],
            },
        },
        'a code block': {
            input: '```js\nconst a = 1;\n\n**not bold**\n```',
            output: {
                type: 'codeBlock',
                source: '```js\nconst a = 1;\n\n**not bold**\n```',
                content: 'const a = 1;\n\n**not bold**',
                language: 'js',
            },
        },
        'a code block without a language': {
            input: '```\ncode\n```',
            output: {
                type: 'codeBlock',
                source: '```\ncode\n```',
                content: 'code',
            },
        },
        'a code block with tildes': {
            input: '~~~ ts extra\ncode\n~~~~',
            output: {
                type: 'codeBlock',
                source: '~~~ ts extra\ncode\n~~~~',
                content: 'code',
                language: 'ts',
            },
        },
        'a code block with an escaped language': {
            input: '```j\\s\ncode\n```',
            output: {
                type: 'codeBlock',
                source: '```j\\s\ncode\n```',
                content: 'code',
                language: 'js',
            },
        },
        'an indented code block fence': {
            input: '  ```\n  indented\n    more\n  ```',
            output: {
                type: 'codeBlock',
                source: '  ```\n  indented\n    more\n  ```',
                content: 'indented\n  more',
            },
        },
        'a code block never closed': {
            input: '```js\ncode\nmore',
            output: {
                type: 'codeBlock',
                source: '```js\ncode\nmore',
                content: 'code\nmore',
                language: 'js',
            },
        },
        'a code block with a closing fence too indented': {
            input: '```\ncode\n    ```\n```',
            output: {
                type: 'codeBlock',
                source: '```\ncode\n    ```\n```',
                content: 'code\n    ```',
            },
        },
        'a quote ended by a line after its code': {
            input: '> ```\n> code\nAfter',
            output: {
                type: 'fragment',
                source: '> ```\n> code\nAfter',
                children: [
                    {
                        type: 'quote',
                        source: '> ```\n> code',
                        children: [
                            {
                                type: 'codeBlock',
                                source: '```\n> code',
                                content: 'code',
                            },
                        ],
                    },
                    {
                        type: 'paragraph',
                        source: 'After',
                        children: [
                            {
                                type: 'text',
                                source: 'After',
                                content: 'After',
                            },
                        ],
                    },
                ],
            },
        },
        'a quote ended by a line after its closed code block': {
            input: '> ```\n> code\n> ```\nAfter',
            output: {
                type: 'fragment',
                source: '> ```\n> code\n> ```\nAfter',
                children: [
                    {
                        type: 'quote',
                        source: '> ```\n> code\n> ```',
                        children: [
                            {
                                type: 'codeBlock',
                                source: '```\n> code\n> ```',
                                content: 'code',
                            },
                        ],
                    },
                    {
                        type: 'paragraph',
                        source: 'After',
                        children: [
                            {
                                type: 'text',
                                source: 'After',
                                content: 'After',
                            },
                        ],
                    },
                ],
            },
        },
        'a list item ended by a line after its code': {
            input: '- ~~~\n  code\nAfter',
            output: {
                type: 'fragment',
                source: '- ~~~\n  code\nAfter',
                children: [
                    {
                        type: 'unorderedList',
                        source: '- ~~~\n  code',
                        items: [
                            {
                                type: 'listItem',
                                source: '- ~~~\n  code',
                                children: [
                                    {
                                        type: 'codeBlock',
                                        source: '~~~\n  code',
                                        content: 'code',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: 'paragraph',
                        source: 'After',
                        children: [
                            {
                                type: 'text',
                                source: 'After',
                                content: 'After',
                            },
                        ],
                    },
                ],
            },
        },
        'triple backticks within a line as text': {
            input: '```code``` here',
            output: {
                type: 'text',
                source: '```code``` here',
                content: '```code``` here',
            },
        },
        rules: {
            input: 'Above\n\n---\n\n***\n\n___\n\n- - -\n\nBelow',
            output: {
                type: 'fragment',
                source: 'Above\n\n---\n\n***\n\n___\n\n- - -\n\nBelow',
                children: [
                    {
                        type: 'paragraph',
                        source: 'Above',
                        children: [
                            {
                                type: 'text',
                                source: 'Above',
                                content: 'Above',
                            },
                        ],
                    },
                    {
                        type: 'rule',
                        source: '---',
                    },
                    {
                        type: 'rule',
                        source: '***',
                    },
                    {
                        type: 'rule',
                        source: '___',
                    },
                    {
                        type: 'rule',
                        source: '- - -',
                    },
                    {
                        type: 'paragraph',
                        source: 'Below',
                        children: [
                            {
                                type: 'text',
                                source: 'Below',
                                content: 'Below',
                            },
                        ],
                    },
                ],
            },
        },
        'paragraphs between blocks without their indentation': {
            input: '# Title\n\n   Indented\n  lines  ',
            output: {
                type: 'fragment',
                source: '# Title\n\n   Indented\n  lines  ',
                children: [
                    {
                        type: 'heading',
                        source: '# Title',
                        level: 1,
                        children: {
                            type: 'text',
                            source: 'Title',
                            content: 'Title',
                        },
                    },
                    {
                        type: 'paragraph',
                        source: '   Indented\n  lines  ',
                        children: [
                            {
                                type: 'text',
                                source: 'Indented\n  lines',
                                content: 'Indented\nlines',
                            },
                        ],
                    },
                ],
            },
        },
        'blocks with different newlines': {
            input: '# Title\r\n- One\r- Two\n\nEnd',
            output: {
                type: 'fragment',
                source: '# Title\r\n- One\r- Two\n\nEnd',
                children: [
                    {
                        type: 'heading',
                        source: '# Title',
                        level: 1,
                        children: {
                            type: 'text',
                            source: 'Title',
                            content: 'Title',
                        },
                    },
                    {
                        type: 'unorderedList',
                        source: '- One\r- Two',
                        items: [
                            {
                                type: 'listItem',
                                source: '- One',
                                children: [
                                    {
                                        type: 'text',
                                        source: 'One',
                                        content: 'One',
                                    },
                                ],
                            },
                            {
                                type: 'listItem',
                                source: '- Two',
                                children: [
                                    {
                                        type: 'text',
                                        source: 'Two',
                                        content: 'Two',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: 'paragraph',
                        source: 'End',
                        children: [
                            {
                                type: 'text',
                                source: 'End',
                                content: 'End',
                            },
                        ],
                    },
                ],
            },
        },
        'a document with every block': {
            input: 'Hi\n\n# Title\n\n- One\n\n> Quoted\n\n---\n\n```\ncode\n```\n\nBye',
            output: {
                type: 'fragment',
                source: 'Hi\n\n# Title\n\n- One\n\n> Quoted\n\n---\n\n```\ncode\n```\n\nBye',
                children: [
                    {
                        type: 'paragraph',
                        source: 'Hi',
                        children: [
                            {
                                type: 'text',
                                source: 'Hi',
                                content: 'Hi',
                            },
                        ],
                    },
                    {
                        type: 'heading',
                        source: '# Title',
                        level: 1,
                        children: {
                            type: 'text',
                            source: 'Title',
                            content: 'Title',
                        },
                    },
                    {
                        type: 'unorderedList',
                        source: '- One',
                        items: [
                            {
                                type: 'listItem',
                                source: '- One',
                                children: [
                                    {
                                        type: 'text',
                                        source: 'One',
                                        content: 'One',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: 'quote',
                        source: '> Quoted',
                        children: [
                            {
                                type: 'paragraph',
                                source: 'Quoted',
                                children: [
                                    {
                                        type: 'text',
                                        source: 'Quoted',
                                        content: 'Quoted',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: 'rule',
                        source: '---',
                    },
                    {
                        type: 'codeBlock',
                        source: '```\ncode\n```',
                        content: 'code',
                    },
                    {
                        type: 'paragraph',
                        source: 'Bye',
                        children: [
                            {
                                type: 'text',
                                source: 'Bye',
                                content: 'Bye',
                            },
                        ],
                    },
                ],
            },
        },
    }))('should parse %s', (_, {input, output}) => {
        expect(parse(input, {blocks: true})).toEqual(output);

        expectVerbatim(output, input);
    });

    it('should read nodes nested too deep as text', () => {
        let node = parse(`${'['.repeat(101)}\\*a${'](u)'.repeat(101)}`);
        let depth = 0;

        while (node.type === 'link') {
            node = node.children;
            depth++;
        }

        expect(depth).toBe(100);

        expect(node).toEqual({
            type: 'text',
            source: '[\\*a](u)',
            content: '[*a](u)',
        });
    });

    it('should read blocks nested too deep as paragraphs', () => {
        let node = parse(`${'>'.repeat(102)} a`, {blocks: true});
        let depth = 0;

        while (node.type === 'quote') {
            [node] = node.children;
            depth++;
        }

        expect(depth).toBe(101);

        expect(node).toEqual({
            type: 'paragraph',
            source: '> a',
            children: [
                {
                    type: 'text',
                    source: '> a',
                    content: '> a',
                },
            ],
        });
    });

    it('should parse only inline formatting and paragraphs by default', () => {
        expect(parse('# Title\n\n- **One**')).toEqual({
            type: 'fragment',
            source: '# Title\n\n- **One**',
            children: [
                {
                    type: 'paragraph',
                    source: '# Title',
                    children: [
                        {
                            type: 'text',
                            source: '# Title',
                            content: '# Title',
                        },
                    ],
                },
                {
                    type: 'paragraph',
                    source: '- **One**',
                    children: [
                        {
                            type: 'text',
                            source: '- ',
                            content: '- ',
                        },
                        {
                            type: 'bold',
                            source: '**One**',
                            children: {
                                type: 'text',
                                source: 'One',
                                content: 'One',
                            },
                        },
                    ],
                },
            ],
        });
    });

    it.each([
        [
            'Hello, \\*world\\*!',
            'Hello, *world*!',
        ],
        [
            '\\A\\B\\C',
            'ABC',
        ],
        [
            '\\\\\\',
            '\\\\',
        ],
        [
            'ABC\\',
            'ABC\\',
        ],
        [
            'ABC\\D',
            'ABCD',
        ],
        [
            'Not escaped',
            'Not escaped',
        ],
    ])('should unescape %s to %s', (input, output) => {
        expect(unescape(input)).toEqual(output);
    });
});
