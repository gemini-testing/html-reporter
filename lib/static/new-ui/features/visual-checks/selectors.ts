import {createSelector} from 'reselect';

import {getBrowsers, getImages, getResults} from '@/static/new-ui/store/selectors';
import {TestStatus} from '@/constants';
import {BrowserEntity, ImageEntity, State} from '@/static/new-ui/types/store';

/** @note NamedImageEntity describes visual assertion, not bound to specific attempt */
export interface NamedImageEntity {
    id: string;
    suitePath: string[];
    browserName: string;
    browserId: string;
    stateName: string;
    status: TestStatus;
    /** Image ids corresponding to other attempts */
    imageIds: string[];
}

type NamedImageGroup = Omit<NamedImageEntity, 'imageIds' | 'status'> & {
    images: (ImageEntity & {timestamp: number})[]
};

export const getNamedImages = createSelector(
    [getImages, getBrowsers, getResults],
    (images, browsers, results): Record<string, NamedImageEntity> => {
        const imageGroups: Record<string, NamedImageGroup> = {};

        for (const image of Object.values(images)) {
            const result = results[image.parentId];
            if (!image.stateName || !result) {
                continue;
            }

            const browser = browsers[result.parentId];
            if (!browser) {
                continue;
            }

            const key = `${browser.id} ${image.stateName}`;

            if (!imageGroups[key]) {
                imageGroups[key] = {
                    id: key,
                    browserId: browser.id,
                    images: [],
                    suitePath: result.suitePath,
                    browserName: browser.name,
                    stateName: image.stateName
                };
            }

            imageGroups[key].images.push(Object.assign({}, image, {timestamp: result.timestamp}));
        }

        const finalGroups: Record<string, NamedImageEntity> = {};
        for (const [key, group] of Object.entries(imageGroups)) {
            // We want to drop stateNames that are not present in the last test run. It means that user removed this
            // stateName from test, so images with such stateName are obsolete.
            const browser = browsers[group.browserId];
            const lastResultId = browser.resultIds[browser.resultIds.length - 1];
            const lastResult = results[lastResultId];

            // if last result 'ok' (not error and running) and doesn't have images we skip it
            // but if last result error (or running) we show it, because there are can be image
            if (
                lastResult.status !== TestStatus.RUNNING &&
                lastResult.status !== TestStatus.ERROR &&
                !lastResult.imageIds.find(imageId => images[imageId].stateName === group.stateName)
            ) {
                continue;
            }

            group.images.sort((a, b) => a.timestamp - b.timestamp);

            finalGroups[key] = {
                id: group.id,
                suitePath: group.suitePath,
                browserId: group.browserId,
                browserName: group.browserName,
                stateName: group.stateName,
                imageIds: group.images.map(img => img.id),
                status: lastResult.status
            };
        }

        return finalGroups;
    }
);

export const getCurrentNamedImage = (state: State): NamedImageEntity | null => {
    const currentNamedImageId = [state.app.visualChecksPage.suiteId, state.app.visualChecksPage.stateName].join(' ');
    const namedImages = getNamedImages(state);

    if (!currentNamedImageId) {
        return Object.values(namedImages)[0];
    }

    return namedImages[currentNamedImageId];
};

export const getCurrentImage = (state: State): ImageEntity | null => {
    const currentNamedImage = getCurrentNamedImage(state);
    if (!currentNamedImage) {
        return null;
    }

    const retryIndex = state.tree.browsers.stateById[currentNamedImage.browserId].retryIndex;
    const currentImageId = currentNamedImage.imageIds.find(imageId => {
        const resultId = state.tree.images.byId[imageId].parentId;

        return state.tree.results.byId[resultId].attempt === retryIndex;
    });

    if (!currentImageId) {
        return null;
    }

    return getImages(state)[currentImageId];
};

export const getImagesByNamedImageIds = (state: State, names: string[]): ImageEntity[] => {
    const results: ImageEntity[] = [];

    const images = getImages(state);
    const namedImages = getNamedImages(state);

    for (const name of names) {
        const namedImage = namedImages[name];

        if (!namedImage) {
            continue;
        }

        results.push(...namedImage.imageIds.map(id => images[id]));
    }

    return results;
};

export const getAttempt = (state: State): number | null => {
    const namedImage = getCurrentNamedImage(state);

    if (namedImage) {
        return state.tree.browsers.stateById[namedImage?.browserId].retryIndex;
    }

    return null;
};

export const getLastAttempt = (state: State): number => {
    const currentNamedImage = getCurrentNamedImage(state);
    const images = getImages(state);
    const currentBrowserId = currentNamedImage?.browserId;
    const currentBrowser = currentBrowserId && state.tree.browsers.byId[currentBrowserId];

    if (currentBrowser) {
        for (let i = currentBrowser?.resultIds.length - 1; i >= 0; i--) {
            const imageId = `${currentBrowser?.resultIds[i]} ${currentNamedImage?.stateName}`;

            if (images[imageId]) {
                return i;
            }
        }
    }

    return 0;
};

export const getCurrentBrowser = (state: State): BrowserEntity | null => {
    const currentNamedImageId = getCurrentNamedImage(state)?.id;
    const namedImages = getNamedImages(state);

    if (currentNamedImageId) {
        const namedImage = namedImages[currentNamedImageId];

        if (!namedImage) {
            return null;
        }

        return state.tree.browsers.byId[namedImage.browserId];
    }

    return null;
};
