import * as fs from 'fs';
import { describe, it } from 'mocha';
import * as assert from 'assert';
import sms from 'source-map-support';

import * as tippex from '../';

sms.install();

const sample = fs.readFileSync( 'test/sample.js', 'utf-8' );

describe( 'tippex', () => {
	describe( 'find', () => {
		let found;

		before( () => {
			found = tippex.find( sample );
		});

		it( 'finds line comments', () => {
			const lines = found.filter( chunk => chunk.type === 'line' );

			const start = sample.indexOf( '//' );
			const end = sample.indexOf( '\n', start );

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

			const start = sample.indexOf( '/*' );
			const end = sample.indexOf( '*/' ) + 2;

			const comment = sample.slice( start, end );

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

			const start = sample.indexOf( '/you' );
			const end = sample.indexOf( 'cool/' ) + 5;
			const regex = sample.slice( start, end );

			assert.equal( regexes.length, 1 );
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

			let start = sample.indexOf( '`the' );
			let end = sample.indexOf( '${' ) + 2;
			let section = sample.slice( start, end );

			assert.deepEqual( templateStrings[0], {
				start,
				end,
				inner: section.slice( 1, -2 ),
				outer: section,
				type: 'templateChunk'
			});

			start = sample.indexOf( '}.' );
			end = sample.indexOf( '\\``' ) + 3;
			section = sample.slice( start, end );

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

			let start = sample.indexOf( "'" );
			let end = sample.indexOf( "';" ) + 1;
			let string = sample.slice( start, end );

			assert.deepEqual( strings[0], {
				start,
				end,
				inner: string.slice( 1, -1 ),
				outer: string,
				type: 'string'
			});

			start = sample.indexOf( '"' );
			end = sample.indexOf( '";' ) + 1;
			string = sample.slice( start, end );

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
			erased = tippex.erase( sample );
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
	});
});
