'use strict';

const { parse } = require('acorn');

module.exports = (content) => parse(content, {
	sourceType: 'module'
});