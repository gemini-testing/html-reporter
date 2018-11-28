'use strict';
var webpack = require('webpack');
var merge = require('webpack-merge');
var commonConfig = require('./webpack.common');
module.exports = merge(commonConfig, {
    mode: 'production',
    plugins: [
        new webpack.EnvironmentPlugin(['NODE_ENV'])
    ]
});
//# sourceMappingURL=webpack.prod.js.map