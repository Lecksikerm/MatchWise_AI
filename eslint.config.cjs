const { defineConfig } = require('eslint/config');

module.exports = defineConfig({
    files: ['**/*.{js,cjs}'],
    ignores: ['node_modules/**'],
    languageOptions: {
        ecmaVersion: 'latest',
        sourceType: 'script',
        globals: {
            console: 'readonly',
            process: 'readonly',
            module: 'readonly',
            require: 'readonly',
            exports: 'readonly',
            __dirname: 'readonly',
            __filename: 'readonly',
            Buffer: 'readonly',
            setTimeout: 'readonly',
            setInterval: 'readonly',
            clearTimeout: 'readonly',
            clearInterval: 'readonly',
        },
    },
    rules: {
        'no-console': 'off',
        'no-unused-vars': ['warn', { argsIgnorePattern: 'next|req|res|err' }],
        'no-undef': 'error',
    },
});
