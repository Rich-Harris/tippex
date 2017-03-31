import getLocation from './getLocation.js';

const keywords = /(case|default|delete|do|else|in|instanceof|new|return|throw|typeof|void)\s*$/;
const punctuators = /(^|\{|\(|\[\.|;|,|<|>|<=|>=|==|!=|===|!==|\+|-|\*\%|<<|>>|>>>|&|\||\^|!|~|&&|\|\||\?|:|=|\+=|-=|\*=|%=|<<=|>>=|>>>=|&=|\|=|\^=|\/=|\/)\s*$/;
const ambiguous = /(\}|\)|\+\+|--)\s*$/;

const punctuatorChars = /[{}()[.;,<>=+\-*%&|\^!~?:/]/;
const keywordChars = /[a-z]/;
const beforeJsxChars = /[=:;,({}[&+]/;

const whitespace = /\s/;

function isWhitespace ( char ) {
	return whitespace.test( char );
}

function isPunctuatorChar ( char ) {
	return punctuatorChars.test( char );
}

function isKeywordChar ( char ) {
	return keywordChars.test( char );
}

function isPunctuator ( str ) {
	return punctuators.test( str );
}

function isKeyword ( str ) {
	return keywords.test( str );
}

function isAmbiguous ( str ) {
	return ambiguous.test( str );
}

export function find ( str ) {
	let quote;
	let escapedFrom;
	let regexEnabled = true;
	let pfixOp = false;
	let jsxTagDepth = 0;
	let stack = [];

	let start;
	let found = [];
	let state = base;

	let lastSignificantChar = null;
	let lastSignificantCharIndex = -1;

	const parenMatches = {};
	const openingParenPositions = {};
	let parenDepth = 0;

	function tokenClosesExpression () {
		if ( lastSignificantChar === ')' ) {
			let c = parenMatches[ lastSignificantCharIndex ];
			while ( isWhitespace( str[ c - 1 ] ) ) c -= 1;

			// if parenthesized expression is immediately preceded by `if`/`while`, it's not closing an expression
			if ( /(if|while)$/.test( str.slice( c - 5, c ) ) ) return false;
		}

		// TODO handle }, ++ and -- tokens immediately followed by / character
		return true;
	}

	function base ( char, i ) {
		if ( char === '/' ) {

			// could be start of regex literal OR division punctuator. Solution via
			// http://stackoverflow.com/questions/5519596/when-parsing-javascript-what-determines-the-meaning-of-a-slash/27120110#27120110

			let previousTokenEnd = i;
			while ( previousTokenEnd > 0 && isWhitespace( str[ previousTokenEnd - 1 ] ) ) {
				previousTokenEnd -= 1;
			}

			let previousTokenStart = previousTokenEnd;

			if ( previousTokenEnd > 0 ) {
				if ( isPunctuatorChar( str[ previousTokenStart - 1 ] ) ) {
					while ( isPunctuatorChar( str[ previousTokenStart - 1 ] ) ) {
						previousTokenStart -= 1;
					}
				} else {
					while ( isKeywordChar( str[ previousTokenStart - 1 ] ) ) {
						previousTokenStart -= 1;
					}
				}

				const previousToken = str.slice( previousTokenStart, previousTokenEnd );

				if ( previousTokenStart !== previousTokenEnd ) {
					if ( isKeyword( previousToken ) || isPunctuator( previousToken ) ) {
						regexEnabled = true;
					} else if ( isAmbiguous( previousToken ) && !tokenClosesExpression() ) {
						regexEnabled = true; // TODO save this determination for when it's necessary?
					} else {
						regexEnabled = false;
					}
				} else {
					regexEnabled = false;
				}
			}

			else {
				regexEnabled = true;
			}

			return start = i, slash;
		}

		if ( char === '"' || char === "'" ) return start = i, quote = char, stack.push( base ), string;
		if ( char === '`' ) return start = i + 1, templateString;

		if ( char === '{' ) {
			lastSignificantChar = char;
			lastSignificantCharIndex = i;
			stack.push( base );
			return base;
		}

		if ( char === '}' ) {
			return start = i + 1, stack.pop();
		}

		if ( char === '(' ) {
			openingParenPositions[ parenDepth++ ] = i;
		}

		if ( char === ')' ) {
			parenMatches[i] = openingParenPositions[ --parenDepth ];
		}

		if ( !pfixOp ) {
			pfixOp = ( char === '+' && str[ i - 1 ] === '+' ) || ( char === '-' && str[ i - 1 ] === '-' );
		}

		if ( char === '<' && ( !lastSignificantChar || beforeJsxChars.test( lastSignificantChar ) ) ) {
			stack.push( base );
			return jsxTagStart;
		}

		if ( !isWhitespace( char ) ) {
			lastSignificantChar = char;
			lastSignificantCharIndex = i;
		}
		return base;
	}

	function slash ( char, i ) {
		if ( char === '/' ) return start = i + 1, lineComment;
		if ( char === '*' ) return start = i + 1, blockComment;
		if ( char === '[' ) return regexEnabled ? ( start = i, regexCharacter ) : base;
		return regexEnabled && !pfixOp ? ( start = i, regex ) : base;
	}

	function regex ( char, i ) {
		if ( char === '[' ) return regexCharacter;
		if ( char === '\\' ) return escapedFrom = regex, escaped;

		if ( char === '/' ) {
			const end = i;
			const value = str.slice( start, end );

			found.push({ start, end, value, type: 'regex' });

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
			const end = i;
			const value = str.slice( start + 1, end );

			found.push({ start: start + 1, end, value, type: 'string' });

			return stack.pop();
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
			const end = i;
			const value = str.slice( start, end );

			found.push({ start, end, value, type: 'templateEnd' });

			return base;
		}

		return templateString;
	}

	function templateStringDollar ( char, i ) {
		if ( char === '{' ) {
			const end = i - 1;
			const value = str.slice( start, end );

			found.push({ start, end, value, type: 'templateChunk' });

			stack.push( templateString );
			return base;
		}
		return templateString( char, i );
	}

	// JSX is an XML-like extension to ECMAScript
	// https://facebook.github.io/jsx/

	function jsxTagStart ( char ) {
		if ( char === '/' ) return jsxTagDepth--, jsxTag;
		return jsxTagDepth++, jsxTag;
	}

	function jsxTag ( char, i ) {
		if ( char === '"' || char === "'" ) return start = i, quote = char, stack.push( jsxTag ), string;
		if ( char === '{' ) return stack.push( jsxTag ), base;
		if ( char === '>' ) {
			if ( jsxTagDepth <= 0 ) return base;
			start = i + 1;
			return jsx;
		}
		if ( char === '/' ) return jsxTagSelfClosing;

		return jsxTag;
	}

	function jsxTagSelfClosing ( char ) {
		if ( char === '>' ) {
			jsxTagDepth--;
			if ( jsxTagDepth <= 0 ) return base;
			return jsx;
		}

		return jsxTag;
	}

	function jsx ( char, end ) {
		if ( char === '{' || char === '<' ) {
			const value = str.slice( start, end );
			found.push({ start, end, value, type: 'jsx' });

			if ( char === '{' ) {
				return stack.push( jsx ), base;
			}

			if ( char === '<' ) {
				return jsxTagStart;
			}
		}

		return jsx;
	}

	function lineComment ( char, end ) {
		if ( char === '\n' ) {
			const value = str.slice( start, end );

			found.push({ start, end, value, type: 'line' });

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
			const end = i - 1;
			const value = str.slice( start, end );

			found.push({ start, end, value, type: 'block' });

			return base;
		}

		return blockComment( char );
	}

	for ( let i = 0; i < str.length; i += 1 ) {
		if ( !state ) {
			const { line, column } = getLocation( str, i );
			const before = str.slice( 0, i );
			const beforeLine = /(^|\n).+$/.exec( before )[0];
			const after = str.slice( i );
			const afterLine = /.+(\n|$)/.exec( after )[0];

			const snippet = `${beforeLine}${afterLine}\n${ Array( beforeLine.length + 1 ).join( ' ' )}^`;

			throw new Error( `Unexpected character (${line}:${column}). If this is valid JavaScript, it's probably a bug in tippex. Please raise an issue at https://github.com/Rich-Harris/tippex/issues – thanks!\n\n${snippet}` );
		}

		state = state( str[i], i );
	}

	// cheeky hack
	if ( state.name === 'lineComment' ) state( '\n', str.length );

	return found;
}

export function erase ( str ) {
	const found = find( str );
	return _erase( str, found );
}

function _erase ( str, found ) {
	let erased = '';
	let charIndex = 0;

	for ( let i = 0; i < found.length; i += 1 ) {
		const chunk = found[i];
		erased += str.slice( charIndex, chunk.start );
		erased += chunk.value.replace( /[^\n]/g, ' ' );

		charIndex = chunk.end;
	}

	erased += str.slice( charIndex );
	return erased;
}

function makeGlobalRegExp ( original ) {
	let flags = 'g';

	if ( original.multiline ) flags += 'm';
	if ( original.ignoreCase ) flags += 'i';
	if ( original.sticky ) flags += 'y';
	if ( original.unicode ) flags += 'u';

	return new RegExp( original.source, flags );
}

export function match ( str, pattern, callback ) {
	const g = pattern.global;
	if ( !g ) pattern = makeGlobalRegExp( pattern );

	const found = find( str );

	let match;
	let chunkIndex = 0;

	while ( match = pattern.exec( str ) ) {
		let chunk;

		do {
			chunk = found[ chunkIndex ];

			if ( chunk && chunk.end < match.index ) {
				chunkIndex += 1;
			} else {
				break;
			}
		} while ( chunk );

		if ( !chunk || chunk.start > match.index ) {
			const args = [].slice.call( match ).concat( match.index, str );
			callback.apply( null, args );
			if ( !g ) break;
		}
	}
}

export function replace ( str, pattern, callback ) {
	let replacements = [];

	match( str, pattern, function ( match ) {
		const start = arguments[ arguments.length - 2 ];
		const end = start + match.length;
		const content = callback.apply( null, arguments );

		replacements.push({ start, end, content });
	});

	let replaced = '';
	let lastIndex = 0;

	for ( let i = 0; i < replacements.length; i += 1 ) {
		const { start, end, content } = replacements[i];
		replaced += str.slice( lastIndex, start ) + content;

		lastIndex = end;
	}

	replaced += str.slice( lastIndex );

	return replaced;
}
