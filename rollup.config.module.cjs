
const babel = require('@rollup/plugin-babel').default;

const builds = {
	input: [ 'src/main/webapp/js/index.js',
			 'src/main/webapp/js/webrtc_adaptor.js', 
			 'src/main/webapp/js/fetch.stream.js',
			 'src/main/webapp/js/video-effect.js',
			 'src/main/webapp/js/embedded-player.js',
			 'src/main/webapp/js/volume-meter-processor.js',],
	output: [{
		dir: 'dist',
		format: 'cjs'
	},
	{
	    dir: 'dist/es',
		format: 'es'
	}
	],
	plugins: [babel({ babelHelpers: 'bundled' })]

};

module.exports = builds