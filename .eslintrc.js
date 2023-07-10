module.exports = {
    extends: ['gemini-testing', 'plugin:@typescript-eslint/recommended', 'plugin:react/recommended'],
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint', 'react'],
    root: true,
    rules: {
        '@typescript-eslint/no-empty-function': 'off'
    },
    overrides: [
        {
            files: ['*.ts', '*.tsx'],
            rules: {
                '@typescript-eslint/explicit-function-return-type': 'error'
            }
        },
        {
            files: ['*.js'],
            rules: {
                '@typescript-eslint/no-var-requires': 'off'
            }
        },
        {
            files: ['test/**'],
            rules: {
                // For convenient casting of test objects
                '@typescript-eslint/no-explicit-any': 'off'
            }
        }
    ]
};
