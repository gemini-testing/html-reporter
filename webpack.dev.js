'use strict';

const webpack = require('webpack');
const merge = require('webpack-merge');

const commonConfig = require('./webpack.common');

module.exports = merge(
    commonConfig,
    {
        mode: 'development',
        optimization: {
            minimize: false
        },
        devtool: 'eval-source-map',
        plugins: [
            new webpack.HotModuleReplacementPlugin()
        ]
    }
);
