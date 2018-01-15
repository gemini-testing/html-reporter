'use strict';

const path = require('path');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackIncludeAssetsPlugin = require('html-webpack-include-assets-plugin');

const staticPath = path.resolve(__dirname, 'lib', 'static');

module.exports = {
    entry: {
        report: ['./index.js', './styles.css'],
        gui: ['./gui.js', './styles.css']
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
                test: /\.js$/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['env', 'react', 'stage-0']
                    }
                }
            }
        ]
    },
    plugins: [
        new ExtractTextPlugin('[name].min.css'),
        new HtmlWebpackPlugin({
            title: 'Gemini report',
            filename: 'index.html',
            template: 'template.html',
            chunks: ['report']
        }),
        new HtmlWebpackPlugin({
            title: 'Gemini gui',
            filename: 'gui.html',
            template: 'template.html',
            chunks: ['gui']
        }),
        new HtmlWebpackIncludeAssetsPlugin({
            files: ['index.html'],
            assets: ['data.js'],
            append: false
        })
    ]
};
