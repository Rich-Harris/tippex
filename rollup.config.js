import buble from 'rollup-plugin-buble';

const pkg = require( './package.json' );

export default {
	entry: 'src/index.js',
	plugins: [ buble() ],
	moduleName: 'tippex',
	sourceMap: true,
	targets: [
		{ dest: pkg.main, format: 'umd' },
		{ dest: pkg.module, format: 'es' }
	]
};
