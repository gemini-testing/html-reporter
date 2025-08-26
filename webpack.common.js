'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackTagsPlugin = require('html-webpack-tags-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const {ProgressPlugin} = require('webpack');

const staticPath = path.resolve(__dirname, 'build', 'lib', 'static');

const uiModeRedirectScript = fs.readFileSync(path.resolve(__dirname, 'lib', 'static', 'ui-mode-redirect.js'), 'utf8');

module.exports = {
    entry: {
        report: ['./index.jsx', './variables.css', './styles.css'],
        gui: ['./gui.jsx', './variables.css', './styles.css', './gui.css'],
        newReport: ['./new-ui/app/report.tsx', './variables.css', './styles.css'],
        newGui: ['./new-ui/app/gui.tsx', './variables.css', './styles.css', './gui.css']
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'lib')
        },
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        fallback: {
            buffer: require.resolve('buffer'),
            crypto: require.resolve('crypto-browserify'),
            events: require.resolve('events'),
            path: require.resolve('path-browserify'),
            stream: require.resolve('stream-browserify')
        }
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
                use: [MiniCssExtractPlugin.loader, {
                    loader: 'css-loader',
                    options: {
                        modules: {
                            auto: true,
                            exportLocalsConvention: 'camelCase'
                        }
                    }
                }]
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
                type: 'asset',
                parser: {
                    dataUrlCondition: {
                        maxSize: 4 * 1024 // 4kb
                    }
                },
                generator: {
                    filename: path.join('assets', '[contenthash][ext][query]')
                }
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
            chunks: ['report'],
            templateParameters: {
                uiModeScript: uiModeRedirectScript
            }
        }),
        new HtmlWebpackTagsPlugin({
            files: ['index.html'],
            scripts: ['data.js', 'sql-wasm.js'],
            append: false
        }),
        new HtmlWebpackPlugin({
            title: 'Gui report',
            filename: 'gui.html',
            template: 'template.html',
            chunks: ['gui'],
            templateParameters: {
                uiModeScript: uiModeRedirectScript
            }
        }),
        new HtmlWebpackTagsPlugin({
            files: ['gui.html'],
            scripts: ['sql-wasm.js'],
            append: false
        }),
        new HtmlWebpackPlugin({
            title: 'HTML report (New UI)',
            filename: 'new-ui-report.html',
            template: 'template-new-ui.html',
            chunks: ['newReport'],
            templateParameters: {
                uiModeScript: uiModeRedirectScript
            }
        }),
        new HtmlWebpackTagsPlugin({
            files: ['new-ui-report.html'],
            scripts: ['data.js', 'sql-wasm.js'],
            append: false
        }),
        new HtmlWebpackPlugin({
            title: 'GUI report (New UI)',
            filename: 'new-ui-gui.html',
            template: 'template-new-ui.html',
            chunks: ['newGui'],
            templateParameters: {
                uiModeScript: uiModeRedirectScript
            }
        }),
        new HtmlWebpackTagsPlugin({
            files: ['new-ui-gui.html'],
            scripts: ['sql-wasm.js'],
            append: false
        })
    ],
    optimization: {
        splitChunks: {chunks: 'all'},
        minimizer: [
            new CssMinimizerPlugin(),
            new TerserPlugin({
                parallel: true,
                terserOptions: {
                    output: {
                        comments: false
                    }
                },
                extractComments: false
            })
        ]
    },
    performance: {maxEntrypointSize: 5000000}
};
