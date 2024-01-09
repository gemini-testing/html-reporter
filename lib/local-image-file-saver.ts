import {copyFileAsync} from './server-utils';
import type {ImageFileSaver} from './types';

export const LocalImageFileSaver: ImageFileSaver = {
    saveImg: async (srcCurrPath, {destPath, reportDir}) => {
        await copyFileAsync(srcCurrPath, destPath, {reportDir});

        return destPath;
    }
};
