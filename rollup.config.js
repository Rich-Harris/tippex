import buble from 'rollup-plugin-buble';
import nodeResolve from 'rollup-plugin-node-resolve';

const pkg = require( './package.json' );

export default {
	input: 'src/index.js',
	plugins: [
		nodeResolve(),
		buble({ exclude: 'node_modules/**' })
	],
	output: [
		{ name: 'tippex', sourcemap: true, file: pkg.main, format: 'umd' },
		{ name: 'tippex', sourcemap: true, file: pkg.module, format: 'es' }
	]
};
