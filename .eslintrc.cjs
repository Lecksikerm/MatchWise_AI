module.exports = {
    env: {
        node: true,
        commonjs: true,
        es2024: true,
    },
    extends: ['eslint:recommended', 'prettier'],
    parserOptions: {
        ecmaVersion: 'latest',
    },
    rules: {
        'no-console': 'off',
        'no-unused-vars': ['warn', { argsIgnorePattern: 'next|req|res|err' }],
        'no-undef': 'error',
    },
};
