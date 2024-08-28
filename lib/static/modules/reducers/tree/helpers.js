import {get, pick, set, uniq, isEmpty} from 'lodash';
import {EXPAND_ALL, EXPAND_ERRORS, EXPAND_RETRIES} from '../../../../constants/expand-modes';
import {ensureDiffProperty, getUpdatedProperty} from '../../utils/state';
import {determineFinalStatus, determineStatus, isImageError, isUpdatedStatus} from '../../../../common-utils';
import {updateParentSuitesStatus, calcSuitesShowness, calcSuitesOpenness} from './nodes/suites';
import {calcBrowsersShowness, calcBrowsersOpenness} from './nodes/browsers';
import {changeImageStatus, calcImagesOpenness} from './nodes/images';
import {ERROR, FAIL} from '../../../../constants';

export function changeNodeState(nodesStateById, nodeId, state, diff = nodesStateById) {
    Object.keys(state).forEach((stateName) => {
        const prevStateValue = get(nodesStateById[nodeId], stateName);

        if (prevStateValue !== state[stateName]) {
            set(diff, [nodeId, stateName], state[stateName]);
        }
    });
}

export function shouldNodeBeOpened(expand, {errorsCb, retriesCb}) {
    if (expand === EXPAND_ERRORS) {
        return errorsCb();
    }

    if (expand === EXPAND_RETRIES) {
        return retriesCb();
    }

    if (expand === EXPAND_ALL) {
        return true;
    }

    return false;
}

export function getShownCheckedChildCount(tree, suiteId, diff = tree) {
    const {suiteIds = [], browserIds = []} = tree.suites.byId[suiteId];
    const checkedChildBrowserCount = browserIds.reduce((sum, browserChildId) => {
        const shouldBeShown = getUpdatedProperty(tree, diff, ['browsers', 'stateById', browserChildId, 'shouldBeShown']);
        const checkStatus = getUpdatedProperty(tree, diff, ['browsers', 'stateById', browserChildId, 'checkStatus']);

        return sum + (shouldBeShown && checkStatus);
    }, 0);
    const checkedChildSuitesCount = suiteIds.reduce((sum, suiteChildId) => {
        const shouldBeShown = getUpdatedProperty(tree, diff, ['suites', 'stateById', suiteChildId, 'shouldBeShown']);
        const checkStatus = getUpdatedProperty(tree, diff, ['suites', 'stateById', suiteChildId, 'checkStatus']);

        return sum + (shouldBeShown && checkStatus);
    }, 0);

    return checkedChildBrowserCount + checkedChildSuitesCount;
}

export function resolveUpdatedStatuses(results, imagesById, suites) {
    for (const result of Object.values(results)) {
        if (!isUpdatedStatus(result.status)) {
            continue;
        }
        const computedStatus = determineStatus({
            status: result.status,
            error: result.error,
            imagesInfo: Object.values(pick(imagesById, result.imageIds))
        });

        result.status = computedStatus;

        const suitesFilteredKeys = Object.entries(suites)
            .filter(([, suite]) => result.id.startsWith(suite.id) && isUpdatedStatus(suite.status))
            .map(([key]) => key);

        for (const suiteKey of suitesFilteredKeys) {
            suites[suiteKey].status = computedStatus;
        }
    }
}

/**
 * @note only one of "(imageIdsArray, newStatus)" or "images" need to be specified
 * @param {Object} param0
 * @param {{id: String, status: String}[]} param0.images
 * @param {String[]} param0.imageIdsArray
 * @param {String} param0.newStatus
 */
export function updateImagesStatus({tree, view, images, imageIdsArray, newStatus, diff = tree}) {
    const resultIds = [];
    const browserIds = [];

    ensureDiffProperty(diff, ['results', 'byId']);

    if (images) {
        for (const image of images) {
            changeImageStatus(tree, image.id, image.status, diff);

            resultIds.push(tree.images.byId[image.id].parentId);
        }
    } else {
        for (const imageId of imageIdsArray) {
            changeImageStatus(tree, imageId, newStatus, diff);

            resultIds.push(tree.images.byId[imageId].parentId);
        }
    }

    const resultIdsUniq = uniq(resultIds);

    for (const resultId of resultIdsUniq) {
        const result = tree.results.byId[resultId];
        const imageStatuses = result.imageIds
            .filter(imageId => Boolean(tree.images.byId[imageId].stateName))
            .map(imageId => getUpdatedProperty(tree, diff, ['images', 'byId', imageId, 'status']));

        const finalStatus = determineFinalStatus(imageStatuses);
        const trueResultStatus = isImageError(result.error) && finalStatus === ERROR ? FAIL : finalStatus;

        if (isImageError(result.error) && trueResultStatus !== result.status) {
            browserIds.push(result.parentId);
            changeNodeState(tree.results.byId, resultId, {status: trueResultStatus}, diff.results.byId);
        }
    }

    const browserIdsUniq = uniq(browserIds);
    const suiteIdsUniq = uniq(browserIdsUniq.map(browserId => tree.browsers.byId[browserId].parentId));

    updateParentSuitesStatus(tree, suiteIdsUniq, view.filteredBrowsers, diff);

    !isEmpty(suiteIdsUniq) && calcSuitesOpenness({tree, expand: view.expand, suiteIds: suiteIdsUniq, diff});
    !isEmpty(browserIdsUniq) && calcBrowsersOpenness({tree, expand: view.expand, browserIds: browserIdsUniq, diff});
    !isEmpty(imageIdsArray) && calcImagesOpenness({tree, expand: view.expand, imageIds: imageIdsArray, diff});

    !isEmpty(browserIdsUniq) && calcBrowsersShowness({tree, view, browserIds: browserIdsUniq, diff});
    !isEmpty(suiteIdsUniq) && calcSuitesShowness({tree, suiteIds: suiteIdsUniq, diff});
}

export function getStaticAccepterStateNameImages(imageIds, staticImageAccepter) {
    const imageIdsArray = typeof imageIds === 'string' ? [imageIds] : imageIds;

    const stateNameImageIds = imageIdsArray.map(imageId => {
        return staticImageAccepter.acceptableImages[imageId].stateNameImageId;
    });

    const acceptableImagesArray = Object.values(staticImageAccepter.acceptableImages);

    return acceptableImagesArray.filter(image => stateNameImageIds.includes(image.stateNameImageId));
}
