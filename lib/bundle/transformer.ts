import * as babel from '@babel/core';
import {addHook} from 'pirates';
import {TRANSFORM_EXTENSIONS} from './constants';

import type {TransformOptions} from '@babel/core';

export const setupTransformHook = (): VoidFunction => {
    const transformOptions: TransformOptions = {
        browserslistConfigFile: false,
        babelrc: false,
        configFile: false,
        compact: false,
        presets: [require('@babel/preset-typescript')],
        plugins: [
            require('@babel/plugin-transform-modules-commonjs'),
            require('@babel/plugin-syntax-import-attributes')
        ]
    };

    const revertTransformHook = addHook(
        (originalCode, filename) => {
            return babel.transform(originalCode, {filename, ...transformOptions})?.code as string;
        },
        {exts: TRANSFORM_EXTENSIONS}
    );

    return revertTransformHook;
};
