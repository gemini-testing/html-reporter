'use strict';
var webpack = require('webpack');
var merge = require('webpack-merge');
var commonConfig = require('./webpack.common');
module.exports = merge(commonConfig, {
    mode: 'development',
    devtool: 'eval-source-map',
    devServer: {
        contentBase: './lib/static',
        inline: true,
        hot: true
    },
    plugins: [
        new webpack.HotModuleReplacementPlugin()
    ]
});
//# sourceMappingURL=webpack.dev.js.map