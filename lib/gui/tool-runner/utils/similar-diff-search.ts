import _ from 'lodash';
import type {CoordBounds} from 'looks-same';

import {TestEqualDiffsData} from '../../../tests-tree-builder/gui';
import {ImageInfoDiff, ImageSize} from '../../../types';

export const filterByEqualDiffSizes = (imagesInfo: TestEqualDiffsData[], refDiffClusters?: CoordBounds[]): TestEqualDiffsData[] => {
    if (!refDiffClusters || _.isEmpty(refDiffClusters)) {
        return [];
    }

    const refDiffSizes = refDiffClusters.map(getDiffClusterSizes);

    return _.filter(imagesInfo, (imageInfo) => {
        const imageInfoFail = imageInfo as ImageInfoDiff;

        const imageDiffSizes = imageInfoFail.diffClusters?.map(getDiffClusterSizes) ?? [];
        const equal = compareDiffSizes(imageDiffSizes, refDiffSizes);

        if (!equal) {
            return false;
        }

        if (!_.isEqual(imageDiffSizes, refDiffSizes)) {
            imageInfoFail.diffClusters = reorderClustersByEqualSize(imageInfoFail.diffClusters ?? [], imageDiffSizes, refDiffSizes);
        }

        return true;
    });
};

function getDiffClusterSizes(diffCluster: CoordBounds): ImageSize {
    return {
        width: diffCluster.right - diffCluster.left + 1,
        height: diffCluster.bottom - diffCluster.top + 1
    };
}

function compareDiffSizes(diffSizes1: ImageSize[], diffSizes2: ImageSize[]): boolean {
    if (diffSizes1.length !== diffSizes2.length) {
        return false;
    }

    return diffSizes1.every((diffSize) => {
        const foundIndex = _.findIndex(diffSizes2, diffSize);

        if (foundIndex < 0) {
            return false;
        }

        diffSizes2 = diffSizes2.filter((_v, ind) => ind !== foundIndex);

        return true;
    });
}

function reorderClustersByEqualSize(diffClusters1: CoordBounds[], diffSizes1: ImageSize[], diffSizes2: ImageSize[]): CoordBounds[] {
    return diffClusters1.reduce((acc, cluster, i) => {
        if (diffSizes1[i] !== diffSizes2[i]) {
            const foundIndex = _.findIndex(diffSizes2, diffSizes1[i]);
            diffSizes2 = diffSizes2.filter((_v, ind) => ind !== foundIndex);
            acc[foundIndex] = cluster;
        } else {
            acc[i] = cluster;
        }

        return acc;
    }, [] as CoordBounds[]);
}
