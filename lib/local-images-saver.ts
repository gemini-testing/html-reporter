import {copyFileAsync} from './server-utils';
import type {ImagesSaver} from './types';

export const LocalImagesSaver: ImagesSaver = {
    saveImg: async (srcCurrPath, {destPath, reportDir}) => {
        await copyFileAsync(srcCurrPath, destPath, {reportDir});

        return destPath;
    }
};
