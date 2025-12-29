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
  plugins: [babel({ babelHelpers: 'bundled' })],

  onwarn(warning, warn) {
    if (warning.code === 'THIS_IS_UNDEFINED') return;
    warn(warning);
  }
};

module.exports = builds;
