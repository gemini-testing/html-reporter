'use strict';

const webpack = require('webpack');
const merge = require('webpack-merge');

const browser = require('./webpack.common');

module.exports = merge(
    browser,
    {
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
    }
);
