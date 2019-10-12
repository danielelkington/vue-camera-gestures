import vue from 'rollup-plugin-vue'; // Handle .vue SFC files
import buble from 'rollup-plugin-buble'; // Transpile/polyfill with reasonable browser support
import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import globals from 'rollup-plugin-node-globals';
export default {
  input: 'src/wrapper.js', // Path relative to package.json
  output: {
    name: 'CameraGestures',
    exports: 'named'
  },
  plugins: [
    commonjs(),
    vue({
      css: true, // Dynamically inject css as a <style> tag
      compileTemplate: true, // Explicitly convert template to render function
      template: {
        isProduction: true
      }
    }),
    buble({
      transforms: {
        asyncAwait: false
      }
    }),
    resolve({
      browser: true
    }),
    globals()
  ],
};