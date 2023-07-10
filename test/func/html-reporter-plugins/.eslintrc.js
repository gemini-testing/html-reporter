module.exports = {
    env: {browser: true},
    plugins: [
        'react'
    ],
    rules: {
        'react/jsx-uses-react': 'error',
        'react/jsx-uses-vars': 'error',
        'react/jsx-no-undef': ['error', {allowGlobals: true}]
    }
};
