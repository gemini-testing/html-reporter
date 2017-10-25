'use strict';

const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

const staticPath = path.resolve(__dirname, 'lib', 'static');

module.exports = {
    entry: {
        bundle: ['./js/app', './styles.css']
    },
    context: staticPath,
    output: {
        path: staticPath,
        filename: '[name].min.js'
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                loader: ExtractTextPlugin.extract({
                    fallback: 'style-loader',
                    use: [{
                        loader: 'css-loader',
                        options: {minimize: true}
                    }]
                })
            },
            {
                test: [path.join(staticPath, 'js')],
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['env', 'react']
                    }
                }
            }
        ]
    },
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
        new ExtractTextPlugin('[name].min.css')
    ]
};
