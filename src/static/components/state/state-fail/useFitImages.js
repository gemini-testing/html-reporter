import {useMemo} from 'react';
import {clamp} from 'lodash';
import useWindowSize from '../../../hooks/useWindowSize';
import useElementSize from '../../../hooks/useElementSize';

const TITLE_DEFAULT_TOP_OFFSET = 280;
const MIN_SHRINK_RATIO = 1;
const MAX_SHRINK_RATIO = 2;

export default function useFitImages(image, isScreenshotAccepterOpened) {
    const {height: windowHeight} = useWindowSize();
    const [expectedRef, expectedPos] = useElementSize();
    const [actualRef, actualPos] = useElementSize();

    const imagesWidth = useMemo(() => {
        return [image.expectedImg, image.actualImg, image.diffImg].map(img => img.size.width);
    }, [image]);

    const imagesHeight = useMemo(() => {
        return [image.expectedImg, image.actualImg, image.diffImg].map(img => img.size.height);
    }, [image]);

    const sectionsWidth = useMemo(() => {
        const expectedWidth = expectedPos.width;
        const actualWidth = actualPos.width;
        const diffWidth = Math.max(expectedWidth, actualWidth);

        return [expectedWidth, actualWidth, diffWidth];
    }, [expectedPos, actualPos]);

    const displayedImagesWidth = useMemo(() => {
        return sectionsWidth.map((sectionWidth, i) => Math.min(sectionWidth, imagesWidth[i]));
    }, [sectionsWidth, imagesWidth]);

    const displayedImagesHeight = useMemo(() => {
        return imagesHeight.map((height, i) => height * displayedImagesWidth[i] / imagesWidth[i]);
    }, [imagesHeight, imagesWidth, displayedImagesWidth]);

    const topOffsets = useMemo(() => {
        const expectedRightBorder = expectedPos.left + expectedPos.width;
        const actualLeftBorder = actualPos.left;
        const imageGap = (actualLeftBorder - expectedRightBorder) / 2;

        const expectedTitleOffset = isScreenshotAccepterOpened ? expectedPos.top : TITLE_DEFAULT_TOP_OFFSET;
        const actualTitleOffset = isScreenshotAccepterOpened ? actualPos.top : TITLE_DEFAULT_TOP_OFFSET;

        const expectedImageOffset = expectedTitleOffset + expectedPos.height + imageGap;
        const actualImageOffset = actualTitleOffset + actualPos.height + imageGap;
        const diffImageOffset = Math.min(expectedImageOffset, actualImageOffset);

        return [expectedImageOffset, actualImageOffset, diffImageOffset];
    }, [expectedPos, actualPos, isScreenshotAccepterOpened]);

    return useMemo(() => {
        const availableHeights = topOffsets.map(offset => windowHeight - offset);
        const shrinkCoef = displayedImagesHeight.reduce((acc, height, i) => {
            return clamp(height / availableHeights[i], acc, MAX_SHRINK_RATIO);
        }, MIN_SHRINK_RATIO);
        const fitWidths = displayedImagesWidth.map((width) => width / shrinkCoef);

        return [fitWidths, {expectedRef, actualRef}];
    }, [topOffsets, displayedImagesWidth, windowHeight]);
}
