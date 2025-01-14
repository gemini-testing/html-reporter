import {preloadImage} from '.';
import {ImageEntity, ImageEntityCommitted, ImageEntityError, ImageEntityFail, ImageEntityStaged, ImageEntitySuccess, ImageEntityUpdated} from '../../new-ui/types/store';

function hasExpectedImage(image: ImageEntity): image is ImageEntityFail | ImageEntitySuccess | ImageEntityUpdated {
    return Object.hasOwn(image, 'expectedImg');
}

function hasActualImage(image: ImageEntity): image is ImageEntityFail | ImageEntityCommitted | ImageEntityError | ImageEntityStaged {
    return Object.hasOwn(image, 'actualImg');
}

function hasDiffImage(image: ImageEntity): image is ImageEntityFail {
    return Object.hasOwn(image, 'diffImg');
}

export function preloadImageEntity(image: ImageEntity): void {
    if (hasExpectedImage(image)) {
        preloadImage(image.expectedImg.path);
    }

    if (hasActualImage(image)) {
        preloadImage(image.actualImg.path);
    }

    if (hasDiffImage(image)) {
        preloadImage(image.diffImg.path);
    }
}
