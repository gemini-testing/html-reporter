// import * as nodePath from 'node:path';
import * as babel from '@babel/core';
import {addHook} from 'pirates';
// import {TRANSFORM_EXTENSIONS, JS_EXTENSION_RE} from './constants';

import type {TransformOptions} from '@babel/core';
// import type {ImportDeclaration} from '@babel/types';

const TRANSFORM_EXTENSIONS = ['.js', '.ts'];

export const setupTransformHook = (): VoidFunction => {
    const transformOptions: TransformOptions = {
        browserslistConfigFile: false,
        babelrc: false,
        configFile: false,
        compact: false,
        // presets: [require('@babel/preset-typescript'), require('@babel/preset-react')],
        plugins: [
            // [
            //     require('@babel/plugin-transform-react-jsx'),
            //     {
            //         throwIfNamespace: false,
            //         runtime: 'automatic',
            //     },
            // ],
            require('@babel/plugin-transform-modules-commonjs'),
        ],
    };

    const revertTransformHook = addHook(
        (originalCode, filename) => {
            console.log('filename:', filename);

            // if (filename.endsWith('App.js')) {
            //     return '';
            // }

            return babel.transform(originalCode, {filename, ...transformOptions})?.code as string;
        },
        {exts: TRANSFORM_EXTENSIONS}
    );

    return revertTransformHook;
};
