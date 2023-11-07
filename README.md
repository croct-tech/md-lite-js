<p align="center">
    <a href="https://croct.com">
        <img src="https://cdn.croct.io/brand/logo/repo-icon-green.svg" alt="Croct" height="80"/>
    </a>
    <br />
    <strong>MD Lite</strong>
    <br />
    A minimalist Markdown parser and render for basic formatting.
</p>
<p align="center">
    <img alt="Build" src="https://img.shields.io/badge/build-passing-green" />
    <img alt="Coverage" src="https://img.shields.io/badge/coverage-100%25-green" />
    <img alt="Maintainability" src="https://img.shields.io/badge/maintainability-100-green" />
    <br />
    <br />
    <a href="https://github.com/croct-tech/md-lite-js/releases">📦 Releases</a>
    ·
    <a href="https://github.com/croct-tech/md-lite-js/issues/new?labels=bug&template=bug-report.md">🐞 Report Bug</a>
    ·
    <a href="https://github.com/croct-tech/md-lite-js/issues/new?labels=enhancement&template=feature-request.md">✨ Request Feature</a>
</p>

## Introduction

This library provides a fast and simple Markdown parser with zero dependencies.
Perfect for those who need to handle basic Markdown syntax like **bold**, *italic*, and [links](#) without the overhead of a full-featured Markdown parser.

**Features**

- 🪶 **Lightweight:**  Zero dependencies and less than 2KB gzipped.
- 🌐 **Cross-environment:**  Works in Node.js and browsers.
- ✍️ **Minimalist:** Supports _italic_, **bold**, ~~strikethrough~~, `inline code`, [links](https://croct.com), <img src="https://github.com/croct-tech/md-lite-js/assets/943036/6e6a2411-67d2-4f7b-89d8-bc08fd73c662" alt="image" width="16" height="16" />, and ¶ paragraphs.
- 🛠 **Flexible:** Render whatever you want, from HTML to JSX.

### Who is this library for?

If you're working on a project that requires rendering Markdown for short texts like titles, subtitles, and descriptions, but you don't need a full-featured Markdown parser, this library is for you.

## Installation
We recommend using [NPM](https://www.npmjs.com) to install the package:

```sh
npm install @croct/md-lite
```

Alternatively, you can use [Yarn](https://yarnpkg.com):

```sh
yarn add @croct/md-lite
```

## Basic usage

After installation, you can import and use the `parse` and `render` functions in your project. 

Here's how you can get started:

### Parsing Markdown

To parse a Markdown string into an AST, use the `parse` function:

```ts
import {parse} from '@croct/md-lite';

const markdown = '**Hello**, [World](https://example.com)';

const ast = parse(markdown);
```

### Rendering Markdown

To render an AST into whatever you want, use the `render` function.

You can pass an AST generated by the `parse` function or a string directly to the `render` function:

```ts
import {render} from '@croct/md-lite';

const markdown = '**Hello**, [World](https://example.com)';

const html = render(ast, {
    fragment: node => node.children.join(''),
    text: node => node.content,
    bold: node => `<b>${node.children}</b>`,
    italic: node => `<i>${node.children}</i>`,
    strike: node => `<s>${node.children}</s>`,
    code: node => `<code>${node.content}</code>`,
    image: node => `<img src="${node.src}" alt="${node.alt}">`,
    link: node => `<a href="${node.href}">${node.children}</a>`,
    paragraph: node => `<p>${node.children.join('')}</p>`,
});
```

You can also render JSX as demonstrated below:

```tsx
import {render} from '@croct/md-lite';

const markdown = '**Hello**, [World](https://example.com)';

const jsx = render(ast, {
    fragment: node => node.children,
    text: node => node.content,
    bold: node => <b>{node.children}</b>,
    italic: node => <i>{node.children}</i>,
    strike: node => <s>{node.children}</s>,
    code: node => <code>{node.content}</code>,
    image: node => <img src={node.src} alt={node.alt} />,
    link: node => <a href={node.href}>{node.children}</a>,
    paragraph: node => <p>{node.children}</p>,
});
```

## Contributing
Contributions to the package are always welcome! 

- Report any bugs or issues on the [issue tracker](https://github.com/croct-tech/md-lite-js/issues).
- For major changes, please [open an issue](https://github.com/croct-tech/md-lite-js/issues) first to discuss what you would like to change.
- Please make sure to update tests as appropriate.

## Testing

Before running the test suites, the development dependencies must be installed:

```sh
npm install
```

Then, to run all tests:

```sh
npm run test
```

Run the following command to check the code against the style guide:

```sh
npm run lint
```

## Building

Before building the project, the dependencies must be installed:

```sh
npm install
```

Then, to build the project:

```sh
npm run build
```


## License

Copyright © 2015-2023 Croct Limited, All Rights Reserved.

All information contained herein is, and remains the property of Croct Limited. The intellectual, design and technical concepts contained herein are proprietary to Croct Limited s and may be covered by U.S. and Foreign Patents, patents in process, and are protected by trade secret or copyright law. Dissemination of this information or reproduction of this material is strictly forbidden unless prior written permission is obtained from Croct Limited.
