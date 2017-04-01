import buble from 'rollup-plugin-buble';
import nodeResolve from 'rollup-plugin-node-resolve';

const pkg = require( './package.json' );

export default {
	entry: 'src/index.js',
	plugins: [
		nodeResolve(),
		buble({ exclude: 'node_modules/**' })
	],
	moduleName: 'tippex',
	sourceMap: true,
	targets: [
		{ dest: pkg.main, format: 'umd' },
		{ dest: pkg.module, format: 'es' }
	]
};
