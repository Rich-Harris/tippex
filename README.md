# Tippex

Erase comments, strings and regular expressions from JavaScript code.

## Why?

Say you want to do some very simple code analysis, such as finding `import` and `export` statements. You *could* just skim over the code with a regex, but you'll get bad results if matches exist inside comments or strings:

```js
import a from './a.js';
// import b from './b.js'; TODO do we need this?
```

Instead, you might generate an abstract syntax tree with a parser like [Acorn](https://github.com/ternjs/acorn), and traverse the AST looking for nodes of a specific type. But for a lot of simple tasks that's overkill – parsing is expensive, traversing is a lot less simple than using regular expressions, and if you're doing anything in the browser it's better to avoid large dependencies.

Tippex offers some middle ground. It's as robust as a full-fledged parser, but miniscule – and an order of magnitude faster. (Americans: Tippex is what you oddballs call 'Liquid Paper' or 'Wite-Out'.)


## What does it do?

Tippex simply replaces comments with equivalent whitespace, and removes the contents of strings (including ES6 template strings) and regular expressions.

So this...

```js
var a = 1; // line comment
/*
  block comment
*/
var b = 2;
var c = /\w+/;
var d = 'some text';
var e = "some more text";
var f = `an ${ 'unnecessarily' ? `${'complicated'}` : `${'template'}` } string`;
```

...becomes this:

```js
var a = 1;                



var b = 2;
var c = /   /;
var d = '         ';
var e = "              ";
var f = `   ${ '             ' ? `${'           '}` : `${'        '}` }       `;
```

Once that's done, you can search for patterns (such as `var` or ` = `) in complete confidence that you won't get any false positives.


## Installation

```bash
npm install --save tippex
```


## Usage

```js
import * as tippex from 'tippex'; // or `var tippex = require('tippex')`, etc

var erased = tippex.erase( 'var a = 1; // line comment' );
// -> 'var a = 1;                '

var found = tippex.find( 'var a = 1; // line comment' );
// -> [{
//      start: 11,
//      end: 26,
//      type: 'line',
//      outer: '// line comment',
//      inner: ' line comment'
//    }]
```


## License

MIT

----

Follow [@Rich_Harris](https://twitter.com/Rich_Harris) on Twitter for more artisanal, hand-crafted JavaScript.
