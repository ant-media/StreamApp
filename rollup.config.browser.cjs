const babel = require('@rollup/plugin-babel').default;

const builds = {
  input: ['src/main/js/index.js'],

  // ✅ MediaPipe bundle edilmesin
  external: [
    '@mediapipe/selfie_segmentation'
  ],

  // ✅ loglevel "this is undefined" warning
  onwarn(warning, warn) {
    if (
      warning.code === 'THIS_IS_UNDEFINED' &&
      warning.id &&
      warning.id.includes('loglevel.min.js')
    ) {
      return;
    }
    warn(warning);
  },

  output: [
    {
      name: 'webrtc_adaptor',
      file: 'dist/browser/webrtc_adaptor.js',
      format: 'umd'
    }
  ],

  plugins: [
    babel({ babelHelpers: 'bundled' })
  ]
};

module.exports = builds;
