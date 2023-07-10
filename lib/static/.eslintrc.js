module.exports = {
    env: {browser: true},
    plugins: [
        'react'
    ],
    rules: {
        'react/jsx-uses-react': 'error',
        'react/jsx-uses-vars': 'error',
        'react/jsx-no-undef': ['error', {allowGlobals: true}],
        'object-curly-spacing': 'off',
        '@typescript-eslint/object-curly-spacing': 'error'
    }
};
