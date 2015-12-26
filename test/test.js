import * as fs from 'fs';
import { describe, it } from 'mocha';
import * as assert from 'assert';

import * as redacter from '../';

const sample = fs.readFileSync( 'test/sample.js', 'utf-8' );

describe( 'redacter', () => {
	describe( 'find', () => {
		it( 'finds line comments', () => {
			const found = redacter.find( sample, {
				line: true
			});

			const start = sample.indexOf( '//' );
			const end = sample.indexOf( '\n', start );

			assert.equal( found.length, 1 );
			assert.deepEqual( found[0], {
				start,
				end,
				inner: ' line comment',
				outer: '// line comment',
				type: 'line'
			});
		});

		it( 'finds block comments', () => {
			const found = redacter.find( sample, {
				block: true
			});

			const start = sample.indexOf( '/*' );
			const end = sample.indexOf( '*/' ) + 2;

			const comment = sample.slice( start, end );

			assert.equal( found.length, 1 );
			assert.deepEqual( found[0], {
				start,
				end,
				inner: comment.slice( 2, -2 ),
				outer: comment,
				type: 'block'
			});
		});

		it( 'finds regular expressions', () => {
			const found = redacter.find( sample, {
				regex: true
			});

			const start = sample.indexOf( '/you' );
			const end = sample.indexOf( 'cool/' ) + 5;
			const regex = sample.slice( start, end );

			assert.equal( found.length, 1 );
			assert.deepEqual( found[0], {
				start,
				end,
				inner: regex.slice( 1, -1 ),
				outer: regex,
				type: 'regex'
			});
		});

		it( 'finds template strings', () => {
			const found = redacter.find( sample, {
				template: true
			});

			assert.equal( found.length, 2 );

			let start = sample.indexOf( '`the' );
			let end = sample.indexOf( '${' ) + 2;
			let section = sample.slice( start, end );

			assert.deepEqual( found[0], {
				start,
				end,
				inner: section.slice( 1, -2 ),
				outer: section,
				type: 'template'
			});

			start = sample.indexOf( '}.' );
			end = sample.indexOf( '\\``' ) + 3;
			section = sample.slice( start, end );

			assert.deepEqual( found[1], {
				start,
				end,
				inner: section.slice( 1, -1 ),
				outer: section,
				type: 'template'
			});
		});

		it( 'finds normal strings', () => {
			const found = redacter.find( sample, {
				string: true
			});

			assert.equal( found.length, 2 );

			let start = sample.indexOf( "'" );
			let end = sample.indexOf( "';" ) + 1;
			let string = sample.slice( start, end );

			assert.deepEqual( found[0], {
				start,
				end,
				inner: string.slice( 1, -1 ),
				outer: string,
				type: 'string'
			});

			start = sample.indexOf( '"' );
			end = sample.indexOf( '";' ) + 1;
			string = sample.slice( start, end );

			assert.deepEqual( found[1], {
				start,
				end,
				inner: string.slice( 1, -1 ),
				outer: string,
				type: 'string'
			});
		});
	});
});
