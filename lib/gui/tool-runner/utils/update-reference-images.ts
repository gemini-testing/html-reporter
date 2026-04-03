import path from 'path';

import {TestAdapter} from '../../../adapters/test';
import {isUpdatedStatus} from '../../../common-utils';
import {TestRefUpdateData} from '../../../tests-tree-builder/gui';
import {AssertViewResult, ImageFile, RefImageFile} from '../../../types';

export const getAssertViewResults = (imagesInfo: TestRefUpdateData['imagesInfo'], testAdapter: TestAdapter, getScreenshotPath: (testAdapter: TestAdapter, stateName: string) => string): AssertViewResult[] =>{
    const assertViewResults: AssertViewResult[] = [];

    imagesInfo
        .filter(({stateName, actualImg}) => Boolean(stateName) && Boolean(actualImg))
        .forEach((imageInfo) => {
            const {stateName, actualImg} = imageInfo as {stateName: string, actualImg: ImageFile};
            const absoluteRefImgPath = getScreenshotPath(testAdapter, stateName);
            const relativeRefImgPath = absoluteRefImgPath && path.relative(process.cwd(), absoluteRefImgPath);
            const refImg: RefImageFile = {path: absoluteRefImgPath, relativePath: relativeRefImgPath, size: actualImg.size};

            assertViewResults.push({stateName, refImg, currImg: actualImg, isUpdated: isUpdatedStatus(imageInfo.status)});
        });

    return assertViewResults;
};
