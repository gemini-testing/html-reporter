'use strict';

const webpack = require('webpack');
const merge = require('webpack-merge');

const browser = require('./webpack.common');

module.exports = merge(
    browser,
    {
        mode: 'production',
        plugins: [
            new webpack.EnvironmentPlugin(['NODE_ENV'])
        ]
    }
);
