#!/usr/bin/env node
'use strict'

const glob = require('glob')
const { Suite } = require('benchmark')

const Benchmark = require('benchmark')
const fs = require('fs')
const path = require('path')
const prettyBytes = require('pretty-bytes')
const prettyMs = require('pretty-ms')

process.chdir(__dirname)

glob.sync('fixture/*.js').forEach(fixture => {
	const content = fs.readFileSync(fixture, 'utf8')
	const size = prettyBytes(Buffer.byteLength(content, 'utf8'))

	console.log(`${ fixture } (${ size }):`)

	const suite = new Suite()
	glob.sync('./*-bench.js').forEach((id) => {
		const fn = require(id);
		suite.add(id, () => {
			fn(content);
		});
	})
	suite.on('error', ({ target: { error } }) => {
		throw error
	})
	suite.on('cycle', ({ target }) => {
		const time = prettyMs(1e3 / target.hz)
		console.log(`  ${ target }`.replace(' x ', ` in ${ time }; `))
	})
	suite.run()
})
