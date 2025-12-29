const babel = require('@rollup/plugin-babel').default;

const builds = {
  input: ['src/main/js/index.js'],
  output: [{
    name: 'webrtc_adaptor',
    file: 'dist/browser/webrtc_adaptor.js',
    format: 'umd',
    globals: {
      '@mediapipe/selfie_segmentation': 'SelfieSegmentation'
    }
  }],
  external: ['@mediapipe/selfie_segmentation'],
  plugins: [babel({ babelHelpers: 'bundled' })]
};

module.exports = builds;