const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ZipWebpackPlugin = require('zip-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const WebpackObfuscator = require('webpack-obfuscator');

module.exports = {
    // mode: 'development', // or 'development' for debugging
    // devtool: 'source-map', // CSP-compliant source maps
    // optimization: {
    //     usedExports: false, // Disable tree-shaking
    // },
    mode: 'production',
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    mangle: true, // Shorten variable and function names
                    compress: {
                        drop_console: false, // Remove console.log statements
                        drop_debugger: true, // Remove debugger statements
                    },
                    output: {
                        comments: true, // Remove comments
                    },
                },
                extractComments: false, // Prevent creation of LICENSE.txt files
            }),
        ],
    },
    entry: {
        angel: './src/angel/app.js',
        zerodha: './src/zerodha/app.js',
    },
    output: {
        filename: '[name]/bundle.js', // Output files named after entry points (e.g., angel/bundle.js)
        path: path.resolve(__dirname, 'dist'),
    },
    module: {
        rules: [
            {
                test: /\.js$/, // Process JavaScript files
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader', // Optional: If you need to transpile ES6+
                },
            },
        ],
    },
    plugins: [
        // Copy HTML files to dist folder while retaining folder structure
        new CopyWebpackPlugin({
            patterns: [
                { from: 'src/angel/angel.html', to: 'angel/index.html' },
                { from: 'src/zerodha/ticker.html', to: 'zerodha/index.html' },
                { from: 'src/manifest.json', to: 'manifest.json' },
                { from: 'src/popup.js', to: 'popup.js' },
                { from: 'src/background.js', to: 'background.js' },
                { from: 'src/contentScript.js', to: 'contentScript.js' },
                { from: 'src/popup.html', to: 'popup.html' },
                { from: 'src/assets', to: 'assets' },
            ],
        }),
        new WebpackObfuscator({
            rotateStringArray: true, // Makes string arrays more difficult to reverse engineer
            stringArray: true,
            stringArrayThreshold: 0.75, // Obfuscate 75% of strings
        }, []), // Exclude files if necessary
        // Add zip-webpack-plugin to create the zip archive
        new ZipWebpackPlugin({
            filename: 'TradeWithPlugin-v3.zip', // The name of the output ZIP file
        }),
    ],
};
