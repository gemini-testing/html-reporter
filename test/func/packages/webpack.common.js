const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
    mode: 'production',
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
                    configFile: path.resolve(__dirname, '../../../babel.config.json')
                }
            }
        ]
    },
    output: {
        filename: '[name].js',
        library: '__testplane_html_reporter_register_plugin__',
        libraryTarget: 'jsonp'
    },
    optimization: {
        minimize: true,
        minimizer: [
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
    }
};
