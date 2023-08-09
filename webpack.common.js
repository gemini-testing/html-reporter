'use strict';

const path = require('path');
const readline = require('readline');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackIncludeAssetsPlugin = require('html-webpack-include-assets-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const {ProgressPlugin} = require('webpack');

const staticPath = path.resolve(__dirname, 'build', 'lib', 'static');

module.exports = {
    entry: {
        report: ['./index.jsx', './variables.css', './styles.css'],
        gui: ['./gui.jsx', './variables.css', './styles.css', './gui.css']
    },
    resolve: {
        extensions: ['.js', '.jsx', '.ts', '.tsx']
    },
    context: path.resolve(__dirname, 'lib', 'static'),
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
                use: [MiniCssExtractPlugin.loader, 'css-loader']
            },
            {
                test: /\.less$/,
                use: [MiniCssExtractPlugin.loader, 'css-loader', 'less-loader']
            },
            {
                test: /\.styl$/,
                use: [MiniCssExtractPlugin.loader, 'css-loader', 'stylus-loader']
            },
            {
                test: /\.[jt]sx?$/,
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
        new ProgressPlugin((percentage, msg, args) => {
            if (percentage < 1) {
                readline.clearLine(process.stdout, 0);
                readline.cursorTo(process.stdout, 0);
                process.stdout.write(`${Math.round(percentage * 100)}% ${msg} ${args}`);
            } else {
                process.stdout.write('\n');
                process.stdout.write(msg);
            }
        }),
        new MiniCssExtractPlugin({filename: '[name].min.css'}),
        new ForkTsCheckerWebpackPlugin({
            typescript: {
                // Points to lib/static/tsconfig.json
                configFile: './tsconfig.json'
            }
        }),
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
    ],
    optimization: {
        minimizer: [
            new CssMinimizerPlugin(),
            new TerserPlugin({
                parallel: true,
                minify: TerserPlugin.uglifyJsMinify,
                terserOptions: {
                    compress: true,
                    mangle: true,
                    format: {
                        comments: false
                    }
                },
                extractComments: false
            })
        ]
    },
    performance: {
        maxEntrypointSize: 2100000,
        assetFilter: assetFilename => !['gui.min.js', 'report.min.js'].includes(assetFilename)
    }
};
