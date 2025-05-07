
const babel = require('@rollup/plugin-babel').default;
const nodeResolve = require('@rollup/plugin-node-resolve').default;
const commonjs = require('@rollup/plugin-commonjs').default;
const css = require("rollup-plugin-import-css");



const builds = {
	input: [ 'src/main/js/index.js',
			 'src/main/js/webrtc_adaptor.js', 
			 'src/main/js/fetch.stream.js',
			 'src/main/js/video-effect.js',
			 'src/main/js/soundmeter.js',
			 'src/main/js/volume-meter-processor.js',
			 'src/main/js/external/loglevel.min.js',
			 'src/main/js/utility.js',
			 'src/main/js/media_manager.js',
			 'src/main/js/stream_merger.js',
			 'src/main/js/draw-desktop-with-camera-source-worker.js',
			],
	output: [{
		dir: 'dist',
		format: 'cjs'
	},
	{
	    dir: 'dist/es',
		format: 'es'
	}
	],
	plugins: [
		babel({ babelHelpers: 'bundled' }), 
		nodeResolve(),
		commonjs(),
		css()
	]

};

module.exports = builds
