
const babel = require('@rollup/plugin-babel').default;

const builds = {
	input: [ 'src/index.js'],
	output: [{
		name: 'embedded_player',
		file: 'dist/browser/embedded_player.js',
		format: 'umd'
	},
	],
	plugins: [babel({ babelHelpers: 'bundled' })]

};

module.exports = builds