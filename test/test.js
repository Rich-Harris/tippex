import * as fs from 'fs';
import { describe, it } from 'mocha';
import * as assert from 'assert';
import sms from 'source-map-support';

import * as tippex from '../';

sms.install();

let samples = {};
fs.readdirSync( 'test/samples' ).forEach( file => {
	samples[ file.replace( '.js', '' ) ] = fs.readFileSync( `test/samples/${file}`, 'utf-8' );
});

describe( 'tippex', () => {
	describe( 'find', () => {
		let found;

		before( () => {
			found = tippex.find( samples.misc );
		});

		it( 'finds line comments', () => {
			const lines = found.filter( chunk => chunk.type === 'line' );

			const start = samples.misc.indexOf( '//' );
			const end = samples.misc.indexOf( '\n', start );

			assert.equal( lines.length, 1 );
			assert.deepEqual( lines[0], {
				start,
				end,
				inner: ' line comment',
				outer: '// line comment',
				type: 'line'
			});
		});

		it( 'finds block comments', () => {
			const blocks = found.filter( chunk => chunk.type === 'block' );

			const start = samples.misc.indexOf( '/*' );
			const end = samples.misc.indexOf( '*/' ) + 2;

			const comment = samples.misc.slice( start, end );

			assert.equal( blocks.length, 1 );
			assert.deepEqual( blocks[0], {
				start,
				end,
				inner: comment.slice( 2, -2 ),
				outer: comment,
				type: 'block'
			});
		});

		it( 'finds regular expressions', () => {
			const regexes = found.filter( chunk => chunk.type === 'regex' );

			const start = samples.misc.indexOf( '/you' );
			const end = samples.misc.indexOf( 'cool/' ) + 5;
			const regex = samples.misc.slice( start, end );

			assert.equal( regexes.length, 2 );
			assert.deepEqual( regexes[0], {
				start,
				end,
				inner: regex.slice( 1, -1 ),
				outer: regex,
				type: 'regex'
			});
		});

		it( 'finds template strings', () => {
			const templateStrings = found.filter( chunk => chunk.type.slice( 0, 8 ) === 'template' );

			assert.equal( templateStrings.length, 2 );

			let start = samples.misc.indexOf( '`the' );
			let end = samples.misc.indexOf( '${' ) + 2;
			let section = samples.misc.slice( start, end );

			assert.deepEqual( templateStrings[0], {
				start,
				end,
				inner: section.slice( 1, -2 ),
				outer: section,
				type: 'templateChunk'
			});

			start = samples.misc.indexOf( '}.' );
			end = samples.misc.indexOf( '\\``' ) + 3;
			section = samples.misc.slice( start, end );

			assert.deepEqual( templateStrings[1], {
				start,
				end,
				inner: section.slice( 1, -1 ),
				outer: section,
				type: 'templateEnd'
			});
		});

		it( 'finds normal strings', () => {
			const strings = found.filter( chunk => chunk.type === 'string' );

			assert.equal( strings.length, 2 );

			let start = samples.misc.indexOf( "'" );
			let end = samples.misc.indexOf( "';" ) + 1;
			let string = samples.misc.slice( start, end );

			assert.deepEqual( strings[0], {
				start,
				end,
				inner: string.slice( 1, -1 ),
				outer: string,
				type: 'string'
			});

			start = samples.misc.indexOf( '"' );
			end = samples.misc.indexOf( '";' ) + 1;
			string = samples.misc.slice( start, end );

			assert.deepEqual( strings[1], {
				start,
				end,
				inner: string.slice( 1, -1 ),
				outer: string,
				type: 'string'
			});
		});
	});

	describe( 'erase', () => {
		let erased;

		before( () => {
			erased = tippex.erase( samples.misc );
		});

		it( 'erases line comments', () => {
			assert.equal( erased.indexOf( 'line comment' ), -1 );
		});

		it( 'erases block comments', () => {
			assert.equal( erased.indexOf( 'Multi' ), -1 );
		});

		it( 'erases regular expressions', () => {
			assert.equal( erased.indexOf( 'ignore' ), -1 );
		});

		it( 'erases template strings', () => {
			assert.equal( erased.indexOf( 'answer is' ), -1 );
			assert.equal( erased.indexOf( 'backtick' ), -1 );
		});

		it( 'erases normal strings', () => {
			assert.equal( erased.indexOf( 'trying to escape' ), -1 );
			assert.equal( erased.indexOf( 'escaped' ), -1 );
		});

		it( 'handles tricky regex/division cases', () => {
			const erased = tippex.erase( samples.regexDivisionBefore );
			assert.equal( erased, samples.regexDivisionAfter );
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
