
const babel = require('@rollup/plugin-babel').default;
const nodeResolve = require('@rollup/plugin-node-resolve').default;
const commonjs = require('@rollup/plugin-commonjs').default;
const css = require("rollup-plugin-import-css");
const replace = require('rollup-plugin-replace');
const terser = require('@rollup/plugin-terser');

const builds = {
	input: [ 
			 'embedded-player.js',
			 'cameraControl.js'
            ],
	output: [
	{
	    dir: 'dist/es',
		format: 'es'
	}
	],
	plugins: [
		babel({ babelHelpers: 'bundled' }), 
		nodeResolve(),
		commonjs(),
		css(),
		replace({
			ENV: JSON.stringify(process.env.NODE_ENV || 'development'),
		  }),
		process.env.NODE_ENV === 'production' && terser(),
	]

};

module.exports = builds