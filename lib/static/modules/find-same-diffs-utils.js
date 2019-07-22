'use strict';

import {get, find, findIndex, filter, flatMap, isEqual} from 'lodash';

const getDiffClusterSizes = (diffCluster) => {
    return {
        width: diffCluster.right - diffCluster.left + 1,
        height: diffCluster.bottom - diffCluster.top + 1
    };
};

const compareDiffSizes = (diffSizes1, diffSizes2) => {
    if (diffSizes1.length !== diffSizes2.length) {
        return false;
    }

    return diffSizes1.every((diffSize) => {
        const foundIndex = findIndex(diffSizes2, diffSize);

        if (foundIndex < 0) {
            return false;
        }

        diffSizes2 = diffSizes2.filter((v, ind) => ind !== foundIndex);

        return true;
    });
};

const reorderClustersByEqualSize = (diffClusters1, diffSizes1, diffSizes2) => {
    return diffClusters1.reduce((acc, cluster, i) => {
        if (diffSizes1[i] !== diffSizes2[i]) {
            const foundIndex = findIndex(diffSizes2, diffSizes1[i]);
            diffSizes2 = diffSizes2.filter((v, ind) => ind !== foundIndex);
            acc[foundIndex] = cluster;
        } else {
            acc[i] = cluster;
        }

        return acc;
    }, []);
};

export const filterByEqualDiffSizes = (imagesInfo, refDiffClusters) => {
    const refDiffSizes = refDiffClusters.map(getDiffClusterSizes);

    return filter(imagesInfo, (imageInfo) => {
        const imageDiffSizes = imageInfo.diffClusters.map(getDiffClusterSizes);
        const equal = compareDiffSizes(imageDiffSizes, refDiffSizes);

        if (!equal) {
            return false;
        }

        if (!isEqual(imageDiffSizes, refDiffSizes)) {
            imageInfo.diffClusters = reorderClustersByEqualSize(imageInfo.diffClusters, imageDiffSizes, refDiffSizes);
        }

        return true;
    });
};

export const getImagesInfoId = ({suitePath, browserId, stateName = ''}) => {
    return suitePath.concat(browserId, stateName).join(' ');
};

export const getRefImagesInfo = ({browser, stateName}) => {
    const {retryIndex} = browser.state;
    const browserResult = browser.retries.concat(browser.result)[retryIndex];

    return stateName ? find(browserResult.imagesInfo, {stateName}) : browserResult.imagesInfo[0];
};

export const getAllOpenedImagesInfo = (fails = []) => {
    const findImagesInfoForBrowser = (node) => {
        const {retryIndex} = node.state;
        const broResult = node.retries.concat(node.result)[retryIndex];

        return broResult.imagesInfo.map((imageInfo) => {
            if (!imageInfo.opened) {
                return null;
            }

            return {suitePath: node.suitePath, browserId: node.name, ...imageInfo};
        }).filter((v) => v);
    };

    const findImagesInfoRecursive = (node) => {
        let resultFromBrowsers = [];
        let resultFromChildren = [];

        if (node.children) {
            resultFromChildren = flatMap(node.children, findImagesInfoRecursive);
        }

        if (node.browsers) {
            resultFromBrowsers = flatMap(node.browsers, (bro) => {
                if (!get(bro, 'state.opened')) {
                    return [];
                }

                return findImagesInfoForBrowser({suitePath: node.suitePath, ...bro});
            });
        }

        return [...resultFromBrowsers, ...resultFromChildren];
    };

    return flatMap(fails, findImagesInfoRecursive);
};

export const filterByBro = (browserId) => {
    return (imageInfo) => imageInfo.browserId === browserId;
};

export const rejectRefImagesInfo = (imagesInfoId) => {
    return (imageInfo) => getImagesInfoId(imageInfo) !== imagesInfoId;
};

export const filterStatus = (checkStatusFn) => {
    return (imageInfo) => checkStatusFn(imageInfo.status);
};

export const filterImagesInfo = (imagesInfo, filterFns) => {
    return imagesInfo.filter((imageInfo) => {
        return [].concat(filterFns).every((fn) => fn(imageInfo));
    });
};
