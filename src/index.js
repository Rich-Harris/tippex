export function find ( str, types = { line: true, block: true, string: true, template: true, regex: true }) {
	let quote;
	let escapedFrom;
	let stack = [];

	let start;
	let found = [];
	let state = base;

	function base ( char, i ) {
		if ( char === '/' ) return start = i, slash;
		if ( char === '"' || char === "'" ) return start = i, quote = char, string;
		if ( char === '`' ) return start = i, templateString;

		if ( char === '{' ) return stack.push( base ), base;
		if ( char === '}' ) return start = i, stack.pop();

		return base;
	}

	function slash ( char ) {
		if ( char === '/' ) return lineComment;
		if ( char === '*' ) return blockComment;
		if ( char === '[' ) return regexCharacter;
		return regex;
	}

	function regex ( char, i ) {
		if ( char === '[' ) return regexCharacter;
		if ( char === '\\' ) return escapedFrom = regex, escaped;

		if ( char === '/' ) {
			if ( types.regex ) {
				const end = i + 1;
				const outer = str.slice( start, end );
				const inner = outer.slice( 1, -1 );

				found.push({ start, end, inner, outer, type: 'regex' });
			}

			return base;
		}

		return regex;
	}

	function regexCharacter ( char ) {
		if ( char === ']' ) return regex;
		if ( char === '\\' ) return escapedFrom = regexCharacter, escaped;
		return regexCharacter;
	}

	function string ( char, i ) {
		if ( char === '\\' ) return escapedFrom = string, escaped;
		if ( char === quote ) {
			if ( types.string ) {
				const end = i + 1;
				const outer = str.slice( start, end );
				const inner = outer.slice( 1, -1 );

				found.push({ start, end, inner, outer, type: 'string' });
			}

			return base;
		}

		return string;
	}

	function escaped () {
		return escapedFrom;
	}

	function templateString ( char, i ) {
		if ( char === '$' ) return templateStringDollar;
		if ( char === '\\' ) return escapedFrom = templateString, escaped;

		if ( char === '`' ) {
			if ( types.template ) {
				const end = i + 1;
				const outer = str.slice( start, end );
				const inner = outer.slice( 1, -1 );

				found.push({ start, end, inner, outer, type: 'templateEnd' });
			}

			return base;
		}

		return templateString;
	}

	function templateStringDollar ( char, i ) {
		if ( char === '{' ) {
			if ( types.template ) {
				const end = i + 1;
				const outer = str.slice( start, end );
				const inner = outer.slice( 1, -2 );

				found.push({ start, end, inner, outer, type: 'templateChunk' });
			}

			stack.push( templateString );
			return base;
		}
		return templateString;
	}

	function lineComment ( char, end ) {
		if ( char === '\n' ) {
			if ( types.line ) {
				const outer = str.slice( start, end );
				const inner = outer.slice( 2 );

				found.push({ start, end, inner, outer, type: 'line' });
			}

			return base;
		}

		return lineComment;
	}

	function blockComment ( char ) {
		if ( char === '*' ) return blockCommentEnding;
		return blockComment;
	}

	function blockCommentEnding ( char, i ) {
		if ( char === '/' ) {
			if ( types.block ) {
				const end = i + 1;
				const outer = str.slice( start, end );
				const inner = outer.slice( 2, -2 );

				found.push({ start, end, inner, outer, type: 'block' });
			}

			return base;
		}

		return blockComment;
	}

	for ( let i = 0; i < str.length; i += 1 ) {
		state = state( str[i], i );
	}

	return found;
}

function spaces ( count ) {
	let spaces = '';
	while ( count-- ) spaces += ' ';
	return spaces;
}

const erasers = {
	string: chunk => chunk.outer[0] + spaces( chunk.inner.length ) + chunk.outer[0],
	line: chunk => spaces( chunk.outer.length ),
	block: chunk => chunk.outer.split( '\n' ).map( line => spaces( line.length ) ).join( '\n' ),
	regex: chunk => '/' + spaces( chunk.inner.length ) + '/',
	templateChunk: chunk => chunk.outer[0] + spaces( chunk.inner.length ) + '${',
	templateEnd: chunk => chunk.outer[0] + spaces( chunk.inner.length ) + '`'
};

export function erase ( str, options ) {
	const found = find( str, options );

	let erased = '';
	let charIndex = 0;

	for ( let i = 0; i < found.length; i += 1 ) {
		const chunk = found[i];
		erased += str.slice( charIndex, chunk.start );
		erased += erasers[ chunk.type ]( chunk );

		charIndex = chunk.end;
	}

	erased += str.slice( charIndex );
	return erased;
}
