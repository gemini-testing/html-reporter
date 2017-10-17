'use strict';

const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const HandlebarsPrecompiler = require('webpack-handlebars-precompiler');
const WebpackCleanPlugin = require('webpack-clean');

const staticPath = path.resolve(__dirname, 'lib', 'static');

module.exports = {
    entry: {
        bundle: ['./hbs-precompiled', './hbs/helpers', './js/app', './styles.css']
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
                test: [path.join(staticPath, 'js'), path.join(staticPath, 'hbs')],
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['env']
                    }
                }
            }
        ]
    },
    plugins: [
        new HandlebarsPrecompiler({
            precompileOpts: {preventIndent: true},
            templatesPath: path.join(staticPath, 'hbs', 'templates'),
            outputFile: path.join(staticPath, 'hbs-precompiled.js')
        }),
        new webpack.optimize.UglifyJsPlugin({
            uglifyOptions: {
                compress: {
                    warnings: false,
                    'drop_console': true,
                    unsafe: true
                }
            }
        }),
        new webpack.ProvidePlugin({
            '_': 'lodash',
            Handlebars: 'handlebars/runtime'
        }),
        new ExtractTextPlugin('[name].min.css'),
        new WebpackCleanPlugin('hbs-precompiled.js', staticPath)
    ]
};
