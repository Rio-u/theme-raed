// postcss.config.js
module.exports = {
  plugins: {
    'postcss-import': {},
    'tailwindcss/nesting': 'postcss-nesting',
    tailwindcss: {},
    'postcss-preset-env': {
      features: {
        'nesting-rules': true,
        // Keep logical properties as written: the polyfill rewrites them to physical
        // LTR values (margin-left, text-align:left…), which breaks RTL storefronts.
        'logical-properties-and-values': false,
        'float-clear-logical-values': false,
        'logical-resize': false,
        'logical-viewport-units': false,
        'logical-overflow': false,
        'logical-overscroll-behavior': false,
      },
    },
  }
}
