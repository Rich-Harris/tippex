var fs = require( 'fs' );
var assert = require( 'assert' );
var Mocha = require( 'mocha' );

var tippex = require( '../' );

require( 'source-map-support' ).install();

var describe = Mocha.describe;
var it = Mocha.it;

var samples = {};
fs.readdirSync( 'test/samples' ).forEach( file => {
	samples[ file.replace( '.js', '' ) ] = fs.readFileSync( `test/samples/${file}`, 'utf-8' );
});

describe( 'tippex', () => {
	describe( 'find', () => {
		var found;

		before( () => {
			found = tippex.find( samples.misc );
		});

		it( 'finds line comments', () => {
			var lines = found.filter( chunk => chunk.type === 'line' );

			var start = samples.misc.indexOf( '//' );
			var end = samples.misc.indexOf( '\n', start );

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
			var blocks = found.filter( chunk => chunk.type === 'block' );

			var start = samples.misc.indexOf( '/*' );
			var end = samples.misc.indexOf( '*/' ) + 2;

			var comment = samples.misc.slice( start, end );

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
			var regexes = found.filter( chunk => chunk.type === 'regex' );

			var start = samples.misc.indexOf( '/you' );
			var end = samples.misc.indexOf( 'cool/' ) + 5;
			var regex = samples.misc.slice( start, end );

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
			var templateStrings = found.filter( chunk => chunk.type.slice( 0, 8 ) === 'template' );

			assert.equal( templateStrings.length, 2 );

			var start = samples.misc.indexOf( '`the' );
			var end = samples.misc.indexOf( '${' ) + 2;
			var section = samples.misc.slice( start, end );

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
			var strings = found.filter( chunk => chunk.type === 'string' );

			assert.equal( strings.length, 2 );

			var start = samples.misc.indexOf( "'" );
			var end = samples.misc.indexOf( "';" ) + 1;
			var string = samples.misc.slice( start, end );

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
		var erased;

		before( () => {
			erased = tippex.erase( samples.misc );
		});

		it( 'erases line comments', () => {
			assert.equal( erased.indexOf( 'line comment' ), -1 );
		});

		it( 'erases line comments w/ parens #8', () => {
			assert.equal( tippex.erase('//)\n//\n'), '   \n  \n' );
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
			var erased = tippex.erase( samples.regexDivisionBefore );
			assert.equal( erased, samples.regexDivisionAfter );
		});

		it( 'handles template strings', () => {
			var erased = tippex.erase( samples.templateStringBefore );
			assert.equal( erased, samples.templateStringAfter );

			var erasedTwice = tippex.erase( samples.templateStringAfter );
			assert.equal( erasedTwice, samples.templateStringAfter );
		});
	});

	describe( 'match', () => {
		it( 'matches regular expressions against the original string', () => {
			var importPattern = /import (\w+) from '([^']+)'/g;

			var results = [];
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
			var importPattern = /import (\w+) from '([^']+)'/;

			var results = [];
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
			var importPattern = /import (\w+) from '([^']+)'/g;

			var result = tippex.replace( samples.imports, importPattern, ( match, name, source ) => {
				return `var ${name} = require('${source}')`;
			});

			assert.equal( result, samples.requires );
		});
	});
});
