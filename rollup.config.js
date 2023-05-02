
const babel = require('@rollup/plugin-babel').default;

const builds = {
	input: 'src/main/webapp/js/webrtc_adaptor.js',
	output: [{
		file: 'dist/webrtc_adaptor.cjs.js',
		format: 'cjs'
	},
	{
	    file: 'dist/webrtc_adaptor.es.js',
		format: 'es'
	},
	{
		name: "webrtc_adaptor",
	    file: 'dist/webrtc_adaptor.js',
		format: 'umd'
	}],
	plugins: [babel({ babelHelpers: 'bundled' })]

};

module.exports = builds