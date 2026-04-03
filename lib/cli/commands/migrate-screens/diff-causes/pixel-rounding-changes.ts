import looksSame, {CoordBounds} from 'looks-same';
import {ImageInfoDiff} from '../../../../types';
import {LooksSameOptions, TimingStats} from '../types';
import {downloadImageIfNeeded} from '../utils';

type CropAxisShift = {start: number; end: number};

const getAxisShifts = (delta: number): CropAxisShift[] => {
    if (delta === 0) {
        return [{start: 0, end: 0}];
    }
    if (delta === 1) {
        return [{start: 0, end: 1}, {start: 1, end: 0}];
    }
    if (delta === 2) {
        return [{start: 0, end: 2}, {start: 1, end: 1}, {start: 2, end: 0}];
    }
    return [];
};

const createSource = (source: string, boundingBox?: CoordBounds): string | {source: string; boundingBox: CoordBounds} => {
    return boundingBox ? {source, boundingBox} : source;
};

export const isDiffDueToPixelRoundingChanges = async (
    imageInfo: ImageInfoDiff,
    {compareOpts, reportPath, stats}: {compareOpts: LooksSameOptions; reportPath: string; stats: TimingStats}
): Promise<boolean> => {
    const actualSize = imageInfo.actualImg.size;
    const expectedSize = imageInfo.expectedImg.size;

    if (!actualSize.width || !actualSize.height || !expectedSize.width || !expectedSize.height) {
        return false;
    }

    const diffWidth = actualSize.width - expectedSize.width;
    const diffHeight = actualSize.height - expectedSize.height;

    if (
        diffWidth === 0 && diffHeight === 0 ||
        Math.abs(diffWidth) > 2 || Math.abs(diffHeight) > 2 ||
        (diffWidth !== 0 && diffHeight !== 0 && Math.sign(diffWidth) !== Math.sign(diffHeight))
    ) {
        return false;
    }

    const cropActual = diffWidth >= 0 && diffHeight >= 0;
    const targetWidth = cropActual ? actualSize.width : expectedSize.width;
    const targetHeight = cropActual ? actualSize.height : expectedSize.height;

    const widthShifts = getAxisShifts(Math.abs(diffWidth));
    const heightShifts = getAxisShifts(Math.abs(diffHeight));

    const actualPath = await downloadImageIfNeeded(reportPath, imageInfo.actualImg.path, stats);
    const expectedPath = await downloadImageIfNeeded(reportPath, imageInfo.expectedImg.path, stats);

    if (!actualPath || !expectedPath) {
        return false;
    }

    for (const heightShift of heightShifts) {
        for (const widthShift of widthShifts) {
            const boundingBox = {
                left: widthShift.start,
                top: heightShift.start,
                right: targetWidth - widthShift.end - 1,
                bottom: targetHeight - heightShift.end - 1
            };

            const actualSource = createSource(actualPath, cropActual ? boundingBox : undefined);
            const expectedSource = createSource(expectedPath, !cropActual ? boundingBox : undefined);

            const compareStartedAt = Date.now();
            const comparison = await looksSame(actualSource, expectedSource, compareOpts);
            stats.compareMs += Date.now() - compareStartedAt;
            stats.comparisons += 1;

            if (comparison.equal) {
                return true;
            }
        }
    }

    return false;
};
