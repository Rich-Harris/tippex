const fs = require( 'fs' );
const assert = require( 'assert' );
const { describe, it } = require( 'mocha' );

require( 'source-map-support' ).install();
require( 'console-group' ).install();

const tippex = require( '../' );

let samples = {};
fs.readdirSync( 'test/samples' ).forEach( file => {
	samples[ file.replace( /\.jsx?$/, '' ) ] = fs.readFileSync( `test/samples/${file}`, 'utf-8' );
});

describe( 'tippex', () => {
	describe( 'find', () => {
		let found;

		before( () => {
			found = tippex.find( samples.misc );
		});

		it( 'finds line comments', () => {
			const lines = found.filter( chunk => chunk.type === 'line' );

			const start = samples.misc.indexOf( '//' ) + 2;
			const end = samples.misc.indexOf( '\n', start );

			assert.equal( lines.length, 1 );
			assert.deepEqual( lines[0], {
				start,
				end,
				value: ' line comment',
				type: 'line'
			});
		});

		it( 'finds block comments', () => {
			const blocks = found.filter( chunk => chunk.type === 'block' );

			const start = samples.misc.indexOf( '/*' ) + 2;
			const end = samples.misc.indexOf( '*/' );

			const comment = samples.misc.slice( start, end );

			assert.equal( blocks.length, 1 );
			assert.deepEqual( blocks[0], {
				start,
				end,
				value: comment,
				type: 'block'
			});
		});

		it( 'finds regular expressions', () => {
			const regexes = found.filter( chunk => chunk.type === 'regex' );

			const start = samples.misc.indexOf( '/you' ) + 1;
			const end = samples.misc.indexOf( 'cool/' ) + 4;
			const regex = samples.misc.slice( start, end );

			assert.equal( regexes.length, 2 );
			assert.deepEqual( regexes[0], {
				start,
				end,
				value: regex,
				type: 'regex'
			});
		});

		it( 'finds template strings', () => {
			const templateStrings = found.filter( chunk => chunk.type.slice( 0, 8 ) === 'template' );

			assert.equal( templateStrings.length, 2 );

			let start = samples.misc.indexOf( '`the' ) + 1;
			let end = samples.misc.indexOf( '${' );
			let section = samples.misc.slice( start, end );

			assert.deepEqual( templateStrings[0], {
				start,
				end,
				value: section,
				type: 'templateChunk'
			});

			start = samples.misc.indexOf( '}.' ) + 1;
			end = samples.misc.indexOf( '\\``' ) + 2;
			section = samples.misc.slice( start, end );

			assert.deepEqual( templateStrings[1], {
				start,
				end,
				value: section,
				type: 'templateEnd'
			});
		});

		it( 'finds normal strings', () => {
			const strings = found.filter( chunk => chunk.type === 'string' );

			assert.equal( strings.length, 2 );

			let start = samples.misc.indexOf( "'" ) + 1;
			let end = samples.misc.indexOf( "';" );
			let string = samples.misc.slice( start, end );

			assert.deepEqual( strings[0], {
				start,
				end,
				value: string,
				type: 'string'
			});

			start = samples.misc.indexOf( '"' ) + 1;
			end = samples.misc.indexOf( '";' );
			string = samples.misc.slice( start, end );

			assert.deepEqual( strings[1], {
				start,
				end,
				value: string,
				type: 'string'
			});
		});
	});

	describe( 'erase', () => {
		const tests = {
			'erases a line comment': [
				`const answer = 42; // line comment`,
				`const answer = 42; //             `
			],

			'erases a line comment at the start of a line': [
				`// line comment`,
				`//             `
			],

			'erases a line comment with parens (#8)': [
				`//)\n//\n`,
				`// \n//\n`
			],

			'removes jsx contents': [
				'<div>this should disappear</div>',
				'<div>                     </div>'
			],

			'removes jsx attributes': [
				'<div x="y"></div>',
				'<div x=" "></div>'
			],

			'handles simple jsx syntax': [
				`/**/<a>/**/{/**/}</a>/**/;`,
				`/**/<a>    {/**/}</a>/**/;`
			],

			'erases block comments': [
				`/*foo*/`,
				`/*   */`
			],

			'erases regular expressions': [
				`const regex = /you can ignore\\/[/]skip me, it's cool/;`,
				`const regex = /                                     /;`
			],

			'erases template strings': [
				"const templateString = `the answer is ${answer}. This is a backtick: \\``;",
				"const templateString = `              ${answer}                        `;"
			],

			'erases normal strings': [
				`const singleQuotedString = 'i\\'m trying to escape';`,
				`const singleQuotedString = '                     ';`
			],

			'handles double trailing asterisks in block comments': [
				'/* double trailing asterisks **/',
				'/*                            */'
			],

			'handles comments before division': [
				'1 /**/ / 2',
				'1 /**/ / 2'
			],

			'handles comments before regex': [
				`foo = 'bar'; /**/ /bar/.test(foo)`,
				`foo = '   '; /**/ /   /.test(foo)`
			],

			'removes dollar inside template string': [
				'const a = `$`;',
				'const a = ` `;'
			],

			'removes escaped dollar inside template string': [
				'const a = `\\$`;',
				'const a = `  `;'
			],

			'removes things that look like template expressions': [
				'const c = `$ {}${ `${ `$` }` }`;',
				'const c = `    ${ `${ ` ` }` }`;'
			],

			'handles curlies inside a regex following export default (#1)': [
				'export default /^}{/',
				'export default /   /'
			]
		};

		Object.keys( tests ).forEach( key => {
			( key[0] === '-' ? it.only : it )( key, () => {
				const [ before, after ] = tests[ key ];
				assert.equal( tippex.erase( before ), after );
			});
		});

		it( 'handles tricky regex/division cases', () => {
			const erased = tippex.erase( samples.regexDivisionBefore );
			assert.equal( erased, samples.regexDivisionAfter );
		});

		it( "handles jsx syntax", () => {
			const erased = tippex.erase( samples.jsxBefore );
			assert.equal( erased, samples.jsxAfter );
		});

		it( 'erases block comments', () => {
			const erased = tippex.erase( samples.misc );
			assert.equal( erased.indexOf( 'Multi' ), -1 );
		});
	});

	describe( 'match', () => {
		it( 'matches regular expressions against the original string', () => {
			const importPattern = /import (\w+) from '([^']+)'/g;

			let results = [];
			tippex.match( samples.imports, importPattern, ( match, name, source ) => {
				results.push({ match, name, source });
			});

			assert.deepEqual( results, [
				{
					match: "import a from './a.js'",
					name: 'a',
					source: './a.js'
				},
				{
					match: "import c from './c.js'",
					name: 'c',
					source: './c.js'
				}
			]);
		});

		it( 'matches regular expressions without the global flag', () => {
			const importPattern = /import (\w+) from '([^']+)'/;

			let results = [];
			tippex.match( samples.imports, importPattern, ( match, name, source ) => {
				results.push({ match, name, source });
			});

			assert.deepEqual( results, [
				{
					match: "import a from './a.js'",
					name: 'a',
					source: './a.js'
				}
			]);
		});
	});

	describe( 'replace', () => {
		it( 'replaces a pattern', () => {
			const importPattern = /import (\w+) from '([^']+)'/g;

			var result = tippex.replace( samples.imports, importPattern, ( match, name, source ) => {
				return `var ${name} = require('${source}')`;
			});

			assert.equal( result, samples.requires );
		});
	});
});
