import _ from 'lodash';
import {isNodeFailed} from '../../../utils';
import {changeNodeState, shouldNodeBeOpened} from '../helpers';

export function initImagesState(tree, expand) {
    calcImagesOpenness(tree, expand);
}

export function calcImagesOpenness(tree, expand, imageIds) {
    if (_.isEmpty(imageIds)) {
        imageIds = tree.images.allIds;
    }

    [].concat(imageIds).forEach((imageId) => {
        const image = tree.images.byId[imageId];
        const shouldBeOpened = calcImageOpenness(image, expand);

        changeImageState(tree, imageId, {shouldBeOpened});
    });
}

export function changeAllImagesState(tree, state) {
    tree.images.allIds.forEach((imageId) => {
        changeImageState(tree, imageId, state);
    });
}

export function changeImageState(tree, imageId, state) {
    changeNodeState(tree.images.stateById, imageId, state);
}

export function addImages(tree, images, expand) {
    images.forEach((image) => {
        tree.images.byId[image.id] = image;

        if (!tree.images.allIds.includes(image.id)) {
            tree.images.allIds.push(image.id);
        }

        const shouldBeOpened = calcImageOpenness(image, expand);
        changeImageState(tree, image.id, {shouldBeOpened});
    });
}

function calcImageOpenness(image, expand) {
    const errorsCb = () => isNodeFailed(image);
    const retriesCb = errorsCb;

    return shouldNodeBeOpened(expand, {errorsCb, retriesCb});
}
