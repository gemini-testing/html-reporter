module.exports = {
    extends: ['gemini-testing', 'plugin:@typescript-eslint/recommended', 'plugin:react/recommended'],
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint', 'react'],
    root: true,
    rules: {
        '@typescript-eslint/no-empty-function': 'off',
        '@typescript-eslint/no-restricted-imports': ['error', {
            "paths": [{
                "name": "testplane",
                "message": "You probably shouldn't import values from testplane, because that would break html-reporter compatibility with other tools.",
                "allowTypeImports": true
            }]
        }]
    },
    overrides: [
        {
            files: ['*.ts', '*.tsx'],
            rules: {
                '@typescript-eslint/explicit-function-return-type': 'error'
            }
        },
        {
            files: ['*.js', '*.jsx'],
            rules: {
                '@typescript-eslint/no-var-requires': 'off'
            }
        },
        {
            files: ['test/**'],
            rules: {
                // For convenient casting of test objects
                '@typescript-eslint/no-explicit-any': 'off',
                '@typescript-eslint/no-restricted-imports': 'off'
            }
        }
    ]
};
