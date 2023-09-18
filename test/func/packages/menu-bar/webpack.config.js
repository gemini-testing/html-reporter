const webpack = require('webpack');
const path = require('path');

module.exports = {
    entry: {
        plugin: './lib/menu-bar-item.jsx'
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [
                    'style-loader',
                    'css-loader'
                ]
            },
            {
                test: /\.jsx$/,
                loader: 'babel-loader',
                exclude: /node_modules/,
                options: {
                    configFile: path.resolve(__dirname, '../../../../.babelrc')
                }
            }
        ]
    },
    output: {
        filename: '[name].js',
        path: __dirname,
        library: '__hermione_html_reporter_register_plugin__',
        libraryTarget: 'jsonp'
    },
    optimization: {
        minimize: true
    }
};
