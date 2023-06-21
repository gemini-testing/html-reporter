module.exports = {
    extends: 'gemini-testing',
    env: {browser: true},
    plugins: [
        'react',
        'babel'
    ],
    parser: 'babel-eslint',
    parserOptions: {
        ecmaFeatures: {
            jsx: true,
            experimentalObjectRestSpread: true
        }
    },
    rules: {
        'react/jsx-uses-react': 'error',
        'react/jsx-uses-vars': 'error',
        'react/jsx-no-undef': ['error', { allowGlobals: true }],
        'object-curly-spacing': 'off',
        'babel/object-curly-spacing': 'error'
    }
};
