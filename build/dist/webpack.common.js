'use strict';
var path = require('path');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var HtmlWebpackIncludeAssetsPlugin = require('html-webpack-include-assets-plugin');
var staticPath = path.resolve(__dirname, 'lib', 'static');
module.exports = {
    context: staticPath,
    entry: {
        report: ['./index.tsx', './styles.css'],
        gui: ['./gui.tsx', './styles.css', './gui.css']
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx']
    },
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
                    use: [
                        {
                            loader: 'css-loader',
                            options: { minimize: true }
                        }
                    ]
                })
            },
            {
                test: /\.(js|ts)x?$/,
                exclude: /node_modules/,
                use: [
                    'tslint-loader',
                    'awesome-typescript-loader'
                ]
            }
        ]
    },
    plugins: [
        new ExtractTextPlugin({
            filename: '[name].min.css'
        }),
        new HtmlWebpackPlugin({
            title: 'HTML report',
            filename: 'index.html',
            template: 'template.html',
            chunks: ['report']
        }),
        new HtmlWebpackPlugin({
            title: 'Gui report',
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
//# sourceMappingURL=webpack.common.js.map