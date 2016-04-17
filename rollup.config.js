import buble from 'rollup-plugin-buble';

export default {
	entry: 'src/index.js',
	plugins: [ buble() ],
	moduleName: 'tippex',
	sourceMap: true
};
