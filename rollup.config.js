import buble from 'rollup-plugin-buble';
import nodeResolve from 'rollup-plugin-node-resolve';

export default {
	entry: 'src/index.js',
	plugins: [
		nodeResolve(),
		buble({ exclude: 'node_modules/**' })
	],
	moduleName: 'tippex',
	sourceMap: true,
	targets: [
		{ format: 'umd', dest: 'dist/tippex.umd.js' },
		{ format: 'es', dest: 'dist/tippex.es.js' }
	]
};
