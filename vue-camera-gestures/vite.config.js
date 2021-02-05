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
      name: 'vue-camera-gestures'
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        globals: {
          vue: 'Vue'
        }
      }
    }
  }
}
