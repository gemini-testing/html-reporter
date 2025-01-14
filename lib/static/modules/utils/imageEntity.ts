import {ImageEntity, ImageEntityCommitted, ImageEntityError, ImageEntityFail, ImageEntityStaged, ImageEntitySuccess, ImageEntityUpdated} from '../../new-ui/types/store';

function preloadImage(url: string): HTMLElement {
    const link = document.createElement('link');

    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    link.onload;

    document.head.appendChild(link);

    return link;
}

function hasExpectedImage(image: ImageEntity): image is ImageEntityFail | ImageEntitySuccess | ImageEntityUpdated {
    return Object.hasOwn(image, 'expectedImg');
}

function hasActualImage(image: ImageEntity): image is ImageEntityFail | ImageEntityCommitted | ImageEntityError | ImageEntityStaged {
    return Object.hasOwn(image, 'actualImg');
}

function hasDiffImage(image: ImageEntity): image is ImageEntityFail {
    return Object.hasOwn(image, 'diffImg');
}

export function preloadImageEntity(image: ImageEntity): () => void {
    const elements: HTMLElement[] = [];

    if (hasExpectedImage(image)) {
        elements.push(preloadImage(image.expectedImg.path));
    }

    if (hasActualImage(image)) {
        elements.push(preloadImage(image.actualImg.path));
    }

    if (hasDiffImage(image)) {
        elements.push(preloadImage(image.diffImg.path));
    }

    return (): void => {
        elements.forEach(element => element.remove());
    };
}
