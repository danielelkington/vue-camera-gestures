import vue from '@vitejs/plugin-vue'
const path = require('path')

/**
 * https://vitejs.dev/config/
 * @type {import('vite').UserConfig}
 */
export default {
  plugins: [vue()],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'lib/index.js'),
      name: 'vue-camera-gestures',
    },
    outDir: 'dist-plain',
    rollupOptions: {
      external: [
        'vue',
        '@tensorflow/tfjs',
        '@tensorflow-models/mobilenet',
        '@tensorflow-models/knn-classifier',
      ],
      output: {
        globals: {
          vue: 'Vue',
          '@tensorflow/tfjs': 'tf',
          '@tensorflow-models/mobilenet': 'mobilenet',
          '@tensorflow-models/knn-classifier': 'knnClassifier',
        },
        exports: 'named'
      },
    },
  },
}
