# webcrack

[![Test](https://github.com/j4k0xb/webcrack/actions/workflows/test.yml/badge.svg)](https://github.com/j4k0xb/webcrack/actions/workflows/test.yml)
[![npm](https://img.shields.io/npm/v/webcrack)](https://www.npmjs.com/package/webcrack)
[![license](https://img.shields.io/github/license/j4k0xb/webcrack)](/LICENSE)

Deobfuscator, unminifier and bundle unpacker for javascript

## Installation

```sh
npm install -g webcrack
```

## Usage

```
Usage: webcrack [options] <file>

Arguments:
  file                 input file

Options:
  -V, --version        output the version number
  -o, --output <path>  output directory (default: "webcrack-out")
  -f, --force          overwrite output directory
  -h, --help           display help for command
```

```js
import { webcrack } from 'webcrack';

console.log(webcrack('const a = 1+1;').code);
```

## Deobfuscations

### [obfuscator.io](https://obfuscator.io)

- String Array
  - Rotate
  - Shuffle
  - Index Shift
  - Variable/Function Wrapper Type
  - None/Base64/RC4 encoding
- Numbers To Expressions

### General/Unminifying

```js
console['\x6c\x6f\x67']('\x61'); // console.log('a')
x && y && z(); // if (x && y) z();
x || y || z(); // if (!(x || y)) z();
!0; // true
!1; // false
![]; // false
!![]; // true
return a(), b(), c(); // a(); b(); return c();
if ((a(), b())) c(); // a(); if (b()) c();
```

### Bundle Unpacking

Extracts each module of a webpack bundle into a separate file.
