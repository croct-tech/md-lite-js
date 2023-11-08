import {parse} from '../src/parsing';
import {MarkdownNode} from '../src/ast';

describe('A Markdown parser function', () => {
    type ParsingScenario = {
        input: string,
        output: MarkdownNode,
    };

    it.each(Object.entries<ParsingScenario>({
        paragraphs: {
            input: 'First paragraph.\n\nSecond paragraph.',
            output: {
                type: 'fragment',
                children: [
                    {
                        type: 'paragraph',
                        children: [
                            {
                                type: 'text',
                                content: 'First paragraph.',
                            },
                        ],
                    },
                    {
                        type: 'paragraph',
                        children: [
                            {
                                type: 'text',
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
                children: [
                    {
                        type: 'paragraph',
                        children: [
                            {
                                type: 'text',
                                content: 'First',
                            },
                        ],
                    },
                    {
                        type: 'paragraph',
                        children: [
                            {
                                type: 'text',
                                content: 'Second',
                            },
                        ],
                    },
                    {
                        type: 'paragraph',
                        children: [
                            {
                                type: 'text',
                                content: 'Third',
                            },
                        ],
                    },
                    {
                        type: 'paragraph',
                        children: [
                            {
                                type: 'text',
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
                children: [
                    {
                        type: 'paragraph',
                        children: [
                            {
                                type: 'text',
                                content: 'First paragraph.',
                            },
                        ],
                    },
                    {
                        type: 'paragraph',
                        children: [
                            {
                                type: 'text',
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
                children: [],
            },
        },
        'paragraphs multiple newlines': {
            input: '\n\n\nFirst paragraph.\n\n\nSecond paragraph.\n\n\n\n',
            output: {
                type: 'fragment',
                children: [
                    {
                        type: 'paragraph',
                        children: [
                            {
                                type: 'text',
                                content: 'First paragraph.',
                            },
                        ],
                    },
                    {
                        type: 'paragraph',
                        children: [
                            {
                                type: 'text',
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
                children: [
                    {
                        type: 'paragraph',
                        children: [
                            {
                                type: 'bold',
                                children: {
                                    type: 'text',
                                    content: 'First',
                                },
                            },
                            {
                                type: 'text',
                                content: '\n',
                            },
                            {
                                type: 'italic',
                                children: {
                                    type: 'text',
                                    content: 'paragraph',
                                },
                            },
                        ],
                    },
                    {
                        type: 'paragraph',
                        children: [
                            {
                                type: 'link',
                                href: 'ex',
                                children: {
                                    type: 'text',
                                    content: 'Second paragraph',
                                },
                            },
                        ],
                    },
                    {
                        type: 'paragraph',
                        children: [
                            {
                                type: 'image',
                                src: 'ex',
                                alt: 'Third paragraph',
                            },
                        ],
                    },
                    {
                        type: 'paragraph',
                        children: [
                            {
                                type: 'text',
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
                content: 'Hello, world!',
            },
        },
        bold: {
            input: 'Hello, **world**!',
            output: {
                type: 'fragment',
                children: [
                    {
                        type: 'text',
                        content: 'Hello, ',
                    },
                    {
                        type: 'bold',
                        children: {
                            type: 'text',
                            content: 'world',
                        },
                    },
                    {
                        type: 'text',
                        content: '!',
                    },
                ],
            },
        },
        'bold with start delimited escaped': {
            input: 'Hello, \\**world**!',
            output: {
                type: 'fragment',
                children: [
                    {
                        type: 'text',
                        content: 'Hello, *',
                    },
                    {
                        type: 'italic',
                        children: {
                            type: 'text',
                            content: 'world',
                        },
                    },
                    {
                        type: 'text',
                        content: '*!',
                    },
                ],
            },
        },
        'bold with end delimited escaped': {
            input: 'Hello, **world\\**!',
            output: {
                type: 'fragment',
                children: [
                    {
                        type: 'text',
                        content: 'Hello, *',
                    },
                    {
                        type: 'italic',
                        children: {
                            type: 'text',
                            content: 'world*',
                        },
                    },
                    {
                        type: 'text',
                        content: '!',
                    },
                ],
            },
        },
        'bold with escaped asterisk': {
            input: 'Hello, **wor\\*\\*ld**!',
            output: {
                type: 'fragment',
                children: [
                    {
                        type: 'text',
                        content: 'Hello, ',
                    },
                    {
                        type: 'bold',
                        children: {
                            type: 'text',
                            content: 'wor**ld',
                        },
                    },
                    {
                        type: 'text',
                        content: '!',
                    },
                ],
            },
        },
        'bold with newline': {
            input: 'Hello, **\nworld**!',
            output: {
                type: 'text',
                content: 'Hello, **\nworld**!',
            },
        },
        'bold unbalanced': {
            input: 'Hello, **world***!',
            output: {
                type: 'fragment',
                children: [
                    {
                        type: 'text',
                        content: 'Hello, ',
                    },
                    {
                        type: 'bold',
                        children: {
                            type: 'text',
                            content: 'world',
                        },
                    },
                    {
                        type: 'text',
                        content: '*!',
                    },
                ],
            },
        },
        'italic (underscore)': {
            input: 'Hello, _world_!',
            output: {
                type: 'fragment',
                children: [
                    {
                        type: 'text',
                        content: 'Hello, ',
                    },
                    {
                        type: 'italic',
                        children: {
                            type: 'text',
                            content: 'world',
                        },
                    },
                    {
                        type: 'text',
                        content: '!',
                    },
                ],
            },
        },
        'italic with start delimited escaped (underscore)': {
            input: 'Hello, \\_world_!',
            output: {
                type: 'text',
                content: 'Hello, _world_!',
            },
        },
        'italic with end delimited escaped (underscore)': {
            input: 'Hello, _world\\_!',
            output: {
                type: 'text',
                content: 'Hello, _world_!',
            },
        },
        'italic with escaped delimiter (underscore)': {
            input: 'Hello, _wor\\_ld_!',
            output: {
                type: 'fragment',
                children: [
                    {
                        type: 'text',
                        content: 'Hello, ',
                    },
                    {
                        type: 'italic',
                        children: {
                            type: 'text',
                            content: 'wor_ld',
                        },
                    },
                    {
                        type: 'text',
                        content: '!',
                    },
                ],
            },
        },
        'italic with newline (underscore)': {
            input: 'Hello, _\nworld_!',
            output: {
                type: 'text',
                content: 'Hello, _\nworld_!',
            },
        },
        'italic (asterisk)': {
            input: 'Hello, *world*!',
            output: {
                type: 'fragment',
                children: [
                    {
                        type: 'text',
                        content: 'Hello, ',
                    },
                    {
                        type: 'italic',
                        children: {
                            type: 'text',
                            content: 'world',
                        },
                    },
                    {
                        type: 'text',
                        content: '!',
                    },
                ],
            },
        },
        'italic with start delimited escaped (asterisk)': {
            input: 'Hello, \\*world*!',
            output: {
                type: 'text',
                content: 'Hello, *world*!',
            },
        },
        'italic with end delimited escaped (asterisk)': {
            input: 'Hello, *world\\*!',
            output: {
                type: 'text',
                content: 'Hello, *world*!',
            },
        },
        'italic with escaped delimiter (asterisk)': {
            input: 'Hello, *wor\\*ld*!',
            output: {
                type: 'fragment',
                children: [
                    {
                        type: 'text',
                        content: 'Hello, ',
                    },
                    {
                        type: 'italic',
                        children: {
                            type: 'text',
                            content: 'wor*ld',
                        },
                    },
                    {
                        type: 'text',
                        content: '!',
                    },
                ],
            },
        },
        'italic with newline (asterisk)': {
            input: 'Hello, *\nworld*!',
            output: {
                type: 'text',
                content: 'Hello, *\nworld*!',
            },
        },
        'bold and italic': {
            input: 'Hello, ***world***!',
            output: {
                type: 'fragment',
                children: [
                    {
                        type: 'text',
                        content: 'Hello, ',
                    },
                    {
                        type: 'bold',
                        children: {
                            type: 'italic',
                            children: {
                                type: 'text',
                                content: 'world',
                            },
                        },
                    },
                    {
                        type: 'text',
                        content: '!',
                    },
                ],
            },
        },
        strike: {
            input: 'Hello, ~~world~~!',
            output: {
                type: 'fragment',
                children: [
                    {
                        type: 'text',
                        content: 'Hello, ',
                    },
                    {
                        type: 'strike',
                        children: {
                            type: 'text',
                            content: 'world',
                        },
                    },
                    {
                        type: 'text',
                        content: '!',
                    },
                ],
            },
        },
        'strike with start delimited escaped': {
            input: 'Hello, \\~~world~~!',
            output: {
                type: 'text',
                content: 'Hello, ~~world~~!',
            },
        },
        'strike with end delimited escaped': {
            input: 'Hello, ~~world\\~~!',
            output: {
                type: 'text',
                content: 'Hello, ~~world~~!',
            },
        },
        'strike with escaped asterisk': {
            input: 'Hello, ~~wor\\~\\~ld~~!',
            output: {
                type: 'fragment',
                children: [
                    {
                        type: 'text',
                        content: 'Hello, ',
                    },
                    {
                        type: 'strike',
                        children: {
                            type: 'text',
                            content: 'wor~~ld',
                        },
                    },
                    {
                        type: 'text',
                        content: '!',
                    },
                ],
            },
        },
        'strike with newline': {
            input: 'Hello, ~~\nworld~~!',
            output: {
                type: 'text',
                content: 'Hello, ~~\nworld~~!',
            },
        },
        'code (single backtick)': {
            input: 'Hello, `world`!',
            output: {
                type: 'fragment',
                children: [
                    {
                        type: 'text',
                        content: 'Hello, ',
                    },
                    {
                        type: 'code',
                        content: 'world',
                    },
                    {
                        type: 'text',
                        content: '!',
                    },
                ],
            },
        },
        'code with trailing and leading whitespace (single backtick)': {
            input: 'Hello, ` world `!',
            output: {
                type: 'fragment',
                children: [
                    {
                        type: 'text',
                        content: 'Hello, ',
                    },
                    {
                        type: 'code',
                        content: 'world',
                    },
                    {
                        type: 'text',
                        content: '!',
                    },
                ],
            },
        },
        'code with start delimited escaped (single backtick)': {
            input: 'Hello, \\`world`!',
            output: {
                type: 'text',
                content: 'Hello, `world`!',
            },
        },
        'code with end delimited escaped (single backtick)': {
            input: 'Hello, `world\\`!',
            output: {
                type: 'text',
                content: 'Hello, `world`!',
            },
        },
        'code with escaped backtick (single backtick)': {
            input: 'Hello, `wor\\`ld`!',
            output: {
                type: 'fragment',
                children: [
                    {
                        type: 'text',
                        content: 'Hello, ',
                    },
                    {
                        type: 'code',
                        content: 'wor`ld',
                    },
                    {
                        type: 'text',
                        content: '!',
                    },
                ],
            },
        },
        'code (double backtick)': {
            input: 'Hello, ``world``!',
            output: {
                type: 'fragment',
                children: [
                    {
                        type: 'text',
                        content: 'Hello, ',
                    },
                    {
                        type: 'code',
                        content: 'world',
                    },
                    {
                        type: 'text',
                        content: '!',
                    },
                ],
            },
        },
        'code with trailing and leading whitespace (double backtick)': {
            input: 'Hello, `` world ``!',
            output: {
                type: 'fragment',
                children: [
                    {
                        type: 'text',
                        content: 'Hello, ',
                    }, {
                        type: 'code',
                        content: 'world',
                    }, {
                        type: 'text',
                        content: '!',
                    },
                ],
            },
        },
        'code with start delimited escaped (double backtick)': {
            input: 'Hello, \\``world``!',
            output: {
                type: 'fragment',
                children: [
                    {
                        type: 'text',
                        content: 'Hello, `',
                    },
                    {
                        type: 'code',
                        content: 'world',
                    },
                    {
                        type: 'text',
                        content: '`!',
                    },
                ],
            },
        },
        'code with end delimited escaped (double backtick)': {
            input: 'Hello, ``world\\``!',
            output: {
                type: 'fragment',
                children: [
                    {
                        type: 'text',
                        content: 'Hello, `',
                    },
                    {
                        type: 'code',
                        content: 'world`',
                    },
                    {
                        type: 'text',
                        content: '!',
                    },
                ],
            },
        },
        'code with escaped backtick (double backtick)': {
            input: 'Hello, ``wor\\`ld``!',
            output: {
                type: 'fragment',
                children: [
                    {
                        type: 'text',
                        content: 'Hello, ',
                    },
                    {
                        type: 'code',
                        content: 'wor`ld',
                    },
                    {
                        type: 'text',
                        content: '!',
                    },
                ],
            },
        },
        'code with unescaped backtick (double backtick)': {
            input: 'Hello, ``wor`ld``!',
            output: {
                type: 'fragment',
                children: [
                    {
                        type: 'text',
                        content: 'Hello, ',
                    },
                    {
                        type: 'code',
                        content: 'wor`ld',
                    },
                    {
                        type: 'text',
                        content: '!',
                    },
                ],
            },
        },
        'code with newline': {
            input: 'Hello, `\nworld`!',
            output: {
                type: 'text',
                content: 'Hello, `\nworld`!',
            },
        },
        link: {
            input: 'Hello, [world](image.png)!',
            output: {
                type: 'fragment',
                children: [
                    {
                        type: 'text',
                        content: 'Hello, ',
                    },
                    {
                        type: 'link',
                        href: 'image.png',
                        children: {
                            type: 'text',
                            content: 'world',
                        },
                    },
                    {
                        type: 'text',
                        content: '!',
                    },
                ],
            },
        },
        'fenced code (unsupported)': {
            input: 'Hello, ```world```!',
            output: {
                type: 'text',
                content: 'Hello, ```world```!',
            },
        },
        'fenced code unbalanced (unsupported)': {
            input: 'Hello, ``world```!',
            output: {
                type: 'text',
                content: 'Hello, ``world```!',
            },
        },
        'link with start delimiter escaped': {
            input: 'Hello, \\[world](image.png)!',
            output: {
                type: 'text',
                content: 'Hello, [world](image.png)!',
            },
        },
        'link with escaped left bracket': {
            input: 'Hello, [wor\\[ld](image.png)!',
            output: {
                type: 'fragment',
                children: [
                    {
                        type: 'text',
                        content: 'Hello, ',
                    },
                    {
                        type: 'link',
                        href: 'image.png',
                        children: {
                            type: 'text',
                            content: 'wor[ld',
                        },
                    },
                    {
                        type: 'text',
                        content: '!',
                    },
                ],
            },
        },
        'link with escaped right bracket': {
            input: 'Hello, [wor\\]ld](image.png)!',
            output: {
                type: 'fragment',
                children: [
                    {
                        type: 'text',
                        content: 'Hello, ',
                    },
                    {
                        type: 'link',
                        href: 'image.png',
                        children: {
                            type: 'text',
                            content: 'wor]ld',
                        },
                    },
                    {
                        type: 'text',
                        content: '!',
                    },
                ],
            },
        },
        'link with escaped left parenthesis': {
            input: 'Hello, [world](https://\\(example.com)!',
            output: {
                type: 'fragment',
                children: [
                    {
                        type: 'text',
                        content: 'Hello, ',
                    },
                    {
                        type: 'link',
                        href: 'https://(example.com',
                        children: {
                            type: 'text',
                            content: 'world',
                        },
                    },
                    {
                        type: 'text',
                        content: '!',
                    },
                ],
            },
        },
        'link with escaped right parenthesis': {
            input: 'Hello, [world](image.png\\))!',
            output: {
                type: 'fragment',
                children: [
                    {
                        type: 'text',
                        content: 'Hello, ',
                    },
                    {
                        type: 'link',
                        href: 'image.png)',
                        children: {
                            type: 'text',
                            content: 'world',
                        },
                    },
                    {
                        type: 'text',
                        content: '!',
                    },
                ],
            },
        },
        'link with formatted text': {
            input: 'Hello, [**world**](image.png)!',
            output: {
                type: 'fragment',
                children: [
                    {
                        type: 'text',
                        content: 'Hello, ',
                    }, {
                        type: 'link',
                        href: 'image.png',
                        children: {
                            type: 'bold',
                            children: {
                                type: 'text',
                                content: 'world',
                            },
                        },
                    }, {
                        type: 'text',
                        content: '!',
                    },
                ],
            },
        },
        image: {
            input: 'Hello, ![world](image.png)!',
            output: {
                type: 'fragment',
                children: [
                    {
                        type: 'text',
                        content: 'Hello, ',
                    },
                    {
                        type: 'image',
                        src: 'image.png',
                        alt: 'world',
                    },
                    {
                        type: 'text',
                        content: '!',
                    },
                ],
            },
        },
        'image with start delimiter escaped': {
            input: 'Hello, \\![world](image.png)!',
            output: {
                type: 'fragment',
                children: [
                    {
                        type: 'text',
                        content: 'Hello, !',
                    },
                    {
                        type: 'link',
                        href: 'image.png',
                        children: {
                            type: 'text',
                            content: 'world',
                        },
                    },
                    {
                        type: 'text',
                        content: '!',
                    },
                ],
            },
        },
        'image with escaped left bracket': {
            input: 'Hello, ![wor\\[ld](image.png)!',
            output: {
                type: 'fragment',
                children: [
                    {
                        type: 'text',
                        content: 'Hello, ',
                    },
                    {
                        type: 'image',
                        src: 'image.png',
                        alt: 'wor[ld',
                    },
                    {
                        type: 'text',
                        content: '!',
                    },
                ],
            },
        },
        'image with escaped right bracket': {
            input: 'Hello, ![wor\\]ld](image.png)!',
            output: {
                type: 'fragment',
                children: [
                    {
                        type: 'text',
                        content: 'Hello, ',
                    },
                    {
                        type: 'image',
                        src: 'image.png',
                        alt: 'wor]ld',
                    },
                    {
                        type: 'text',
                        content: '!',
                    },
                ],
            },
        },
        'image with escaped left parenthesis': {
            input: 'Hello, ![world](https://\\(example.com)!',
            output: {
                type: 'fragment',
                children: [
                    {
                        type: 'text',
                        content: 'Hello, ',
                    },
                    {
                        type: 'image',
                        src: 'https://(example.com',
                        alt: 'world',
                    },
                    {
                        type: 'text',
                        content: '!',
                    },
                ],
            },
        },
        'image with escaped right parenthesis': {
            input: 'Hello, ![world](image.png\\))!',
            output: {
                type: 'fragment',
                children: [
                    {
                        type: 'text',
                        content: 'Hello, ',
                    },
                    {
                        type: 'image',
                        src: 'image.png)',
                        alt: 'world',
                    },
                    {
                        type: 'text',
                        content: '!',
                    },
                ],
            },
        },
        'image with formatted text': {
            input: 'Hello, ![**world**](image.png)!',
            output: {
                type: 'fragment',
                children: [
                    {
                        type: 'text',
                        content: 'Hello, ',
                    },
                    {
                        type: 'image',
                        src: 'image.png',
                        alt: '**world**',
                    },
                    {
                        type: 'text',
                        content: '!',
                    },
                ],
            },
        },
        'link with image': {
            input: 'Hello, [![world](image.png)](https://example.com)!',
            output: {
                type: 'fragment',
                children: [
                    {
                        type: 'text',
                        content: 'Hello, ',
                    },
                    {
                        type: 'link',
                        href: 'https://example.com',
                        children: {
                            type: 'image',
                            src: 'image.png',
                            alt: 'world',
                        },
                    },
                    {
                        type: 'text',
                        content: '!',
                    },
                ],
            },
        },
        'mixed formatting': {
            input: 'Hello, **_~~`[world](image.png)`~~_**!',
            output: {
                type: 'fragment',
                children: [
                    {
                        type: 'text',
                        content: 'Hello, ',
                    }, {
                        type: 'bold',
                        children: {
                            type: 'italic',
                            children: {
                                type: 'strike',
                                children: {
                                    type: 'code',
                                    content: '[world](image.png)',
                                },
                            },
                        },
                    }, {
                        type: 'text',
                        content: '!',
                    },
                ],
            },
        },
    }))('should parse %s', (_, {input, output}) => {
        expect(parse(input)).toEqual(output);
    });
});
