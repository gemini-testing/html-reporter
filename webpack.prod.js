'use strict';

const webpack = require('webpack');
const merge = require('webpack-merge');

const commonConfig = require('./webpack.common');

module.exports = merge(
    commonConfig,
    {
        plugins: [
            new webpack.optimize.UglifyJsPlugin({
                uglifyOptions: {
                    compress: {
                        warnings: false,
                        'drop_console': true,
                        unsafe: true
                    }
                }
            }),
            new webpack.EnvironmentPlugin(['NODE_ENV'])
        ]
    }
);
