const webpack = require('webpack');

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
                use: 'babel-loader',
                exclude: /node_modules/
            }
        ]
    },
    output: {
        filename: '[name].js',
        path: __dirname,
        library: '__hermione_html_reporter_register_plugin__',
        libraryTarget: 'jsonp'
    },
    plugins: [
        new webpack.optimize.UglifyJsPlugin({
            uglifyOptions: {
                compress: {
                    warnings: true,
                    'drop_console': true,
                    unsafe: true
                }
            }
        })
    ]
};
