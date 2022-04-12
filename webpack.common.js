'use strict';

const path = require('path');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackIncludeAssetsPlugin = require('html-webpack-include-assets-plugin');

const staticPath = path.resolve(__dirname, 'lib', 'static');

module.exports = {
    entry: {
        report: ['./index.js', './styles.css'],
        gui: ['./gui.js', './styles.css', './gui.css']
    },
    context: staticPath,
    output: {
        path: staticPath,
        filename: '[name].min.js',
        hotUpdateChunkFilename: '../../hot/hot-update.js',
        hotUpdateMainFilename: '../../hot/hot-update.json'
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
                test: /\.less$/,
                loader: ExtractTextPlugin.extract({
                    fallback: 'style-loader',
                    use: ['css-loader', 'less-loader']
                })
            },
            {
                test: /\.styl$/,
                loader: ExtractTextPlugin.extract({
                    fallback: 'style-loader',
                    use: ['css-loader', 'stylus-loader']
                })
            },
            {
                test: /\.js$/,
                use: 'babel-loader',
                exclude: /node_modules/
            },
            {
                test: /\.(png|woff|woff2|eot|ttf|svg)$/,
                loader: 'url-loader'
            }
        ]
    },
    plugins: [
        new ExtractTextPlugin('[name].min.css'),
        new HtmlWebpackPlugin({
            title: 'HTML report',
            filename: 'index.html',
            template: 'template.html',
            chunks: ['report']
        }),
        new HtmlWebpackIncludeAssetsPlugin({
            files: ['index.html'],
            assets: ['data.js', 'sql-wasm.js'],
            append: false
        }),
        new HtmlWebpackPlugin({
            title: 'Gui report',
            filename: 'gui.html',
            template: 'template.html',
            chunks: ['gui']
        }),
        new HtmlWebpackIncludeAssetsPlugin({
            files: ['gui.html'],
            assets: ['sql-wasm.js'],
            append: false
        })
    ]
};
