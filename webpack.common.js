'use strict';

const path = require('path');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

const staticPath = path.resolve(__dirname, 'lib', 'static');

module.exports = {
    entry: {
        bundle: ['./index.js', './styles.css']
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
        new ExtractTextPlugin('[name].min.css')
    ]
};
