import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    server: {
        host: '0.0.0.0',
        port: 5173,
        strictPort: true
    },
    define: {
        // Provide CommonJS globals for browser
        'global': 'globalThis',
        'exports': '{}',
        'module': '{ exports: {} }'
    },
    optimizeDeps: {
        include: [
            'lib/**/*.js',
            'expect',
            'aria-query',
            'css-shorthand-properties',
            'css-value',
            'grapheme-splitter',
            'lodash.clonedeep',
            'lodash.zip',
            'minimatch',
            'rgb2hex',
            'ws'
        ]
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '../../lib'),
            'lib': path.resolve(__dirname, '../../lib')
        }
    },
    css: {
        modules: {
            localsConvention: 'camelCase'
        }
    }
});
