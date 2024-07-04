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
        plugins: [
            require('@babel/plugin-transform-modules-commonjs')
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
