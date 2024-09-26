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
    <a href="https://www.npmjs.com/package/@croct/md-lite"><img alt="Version" src="https://img.shields.io/npm/v/@croct/md-lite"/></a>
    <a href="https://github.com/croct-tech/md-lite-js/actions/workflows/validate-branch.yaml"><img alt="Build" src="https://github.com/croct-tech/md-lite-js/actions/workflows/validate-branch.yaml/badge.svg" /></a>
    <a href="https://codeclimate.com/repos/654abd6e5167670cf20e64a0/maintainability"><img src="https://api.codeclimate.com/v1/badges/d8dfc7cb03405d137fbd/maintainability" /></a>
    <a href="https://codeclimate.com/repos/654abd6e5167670cf20e64a0/test_coverage"><img src="https://api.codeclimate.com/v1/badges/d8dfc7cb03405d137fbd/test_coverage" /></a>
    <a href="https://bundlephobia.com/package/@croct/md-lite"><img alt="Gzipped bundle size" src="https://badgen.net/bundlephobia/minzip/@croct/md-lite"></a>
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
Perfect for those who need to handle basic Markdown syntax without the overhead of a full-featured Markdown parser.

**Features**

- 🪶 **Lightweight:**  Zero dependencies, about 1.5 KB gzipped.
- 🌐 **Cross-environment:**  Works in Node.js and browsers.
- ✍️ **Minimalist:** Supports only _italic_, **bold**, ~~strikethrough~~, `inline code`, [links](#), 🖼️ images, and ¶ paragraphs.
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

The following sections show how to parse and render Markdown using this library.

### Parsing Markdown

To parse a Markdown string into an AST, use the `parse` function:

```ts
import {parse} from '@croct/md-lite';

const markdown = '**Hello**, [World](https://example.com)';

const ast = parse(markdown);
```

The `parse` function returns a tree-like structure called an [Abstract Syntax Tree](https://en.wikipedia.org/wiki/Abstract_syntax_tree) (AST).
You can find the full AST definition [here](/src/ast.ts).

### Rendering Markdown

To render an AST into whatever you want, use the `render` function.
It accepts as input either a Markdown string or an AST:

```ts
import {render} from '@croct/md-lite';

// Passing a string as input is equivalent to calling `parse` first
const markdown = '**Hello**, [World](https://example.com)';

const html = render(markdown, {
    fragment: node => node.children.join(''),
    text: node => node.content,
    bold: node => `<b>${node.children}</b>`,
    italic: node => `<i>${node.children}</i>`,
    strike: node => `<s>${node.children}</s>`,
    code: node => `<code>${node.content}</code>`,
    link: node => `<a href="${node.href}">${node.children}</a>`,
    image: node => `<img src="${node.src}" alt="${node.alt}">`,
    paragraph: node => `<p>${node.children.join('')}</p>`,
});
```

Here is an example of how to render the Markdown string above into JSX:

```tsx
import {render} from '@croct/md-lite';

// Passing a string as input is equivalent to calling `parse` first
const markdown = '**Hello**, [World](https://example.com)';

const jsx = render(markdown, {
    fragment: node => node.children,
    text: node => node.content,
    bold: node => <b key={node.index}>{node.children}</b>,
    italic: node => <i key={node.index}>{node.children}</i>,
    strike: node => <s key={node.index}>{node.children}</s>,
    code: node => <code key={node.index}>{node.content}</code>,
    link: node => <a key={node.index} href={node.href}>{node.children}</a>,
    image: node => <img key={node.index} src={node.src} alt={node.alt} />,
    paragraph: node => <p key={node.index}>{node.children}</p>,
});
```

#### Handling unsupported features

In some cases, you might want to intentionally omit certain features from your 
rendered Markdown. For instance, if your platform doesn't support image rendering, 
ou can simply return the original source text instead of trying to display the image.

```ts
import {render, unescape} from '@croct/md-lite';

render(markdown, {
    // ... other render functions
    image: node => unescape(node.source),
});
```

This code snippet will simply return the raw source code of the image node 
instead of trying to render it as an image. You can adapt this approach 
to handle any other unsupported feature by defining appropriate render 
functions and accessing the relevant data from the AST.

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
