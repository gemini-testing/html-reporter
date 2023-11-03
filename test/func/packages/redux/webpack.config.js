const merge = require('webpack-merge');
const commonConfig = require('../webpack.common');

module.exports = merge(commonConfig, {
    entry: {
        plugin: './lib/color-border.jsx'
    },
    output: {
        path: __dirname
    }
});
