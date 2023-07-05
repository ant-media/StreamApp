
const babel = require('@rollup/plugin-babel').default;

const builds = {
	input: [ 'src/main/webapp/js/index.js'],
	output: [{
		name: 'webrtc_adaptor',
		file: 'dist/browser/webrtc_adaptor.js',
		format: 'umd'
	},
	],
	plugins: [babel({ babelHelpers: 'bundled' })]

};

module.exports = builds