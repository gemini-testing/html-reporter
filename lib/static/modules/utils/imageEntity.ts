import {ImageEntity, ImageEntityCommitted, ImageEntityError, ImageEntityFail, ImageEntityStaged, ImageEntitySuccess, ImageEntityUpdated} from '../../new-ui/types/store';

class LinkCache {
    private static cache: Record<string, HTMLLinkElement | undefined> = {};

    private static createPreloadLink(url: string): HTMLLinkElement {
        const link = document.createElement('link');

        link.rel = 'preload';
        link.as = 'image';
        link.href = url;

        document.head.appendChild(link);

        return link;
    }

    static register(url: string): void {
        if (LinkCache.cache[url]) {
            return;
        }

        LinkCache.cache[url] = LinkCache.createPreloadLink(url);
    }

    static dispose(url: string): void {
        LinkCache.cache[url]?.remove();

        delete LinkCache.cache[url];
    }
}

// TODO: remove export when old ui is removed
export function preloadImage(url: string): () => void {
    LinkCache.register(url);

    return () => LinkCache.dispose(url);
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

function hasRefImage(image: ImageEntity): image is ImageEntityFail {
    return Object.hasOwn(image, 'refImg');
}

export function preloadImageEntity(image: ImageEntity): () => void {
    const disposeCallbacks: (() => void)[] = [];

    if (hasExpectedImage(image)) {
        disposeCallbacks.push(preloadImage(image.expectedImg.path));
    }

    if (hasActualImage(image)) {
        disposeCallbacks.push(preloadImage(image.actualImg.path));
    }

    if (hasDiffImage(image)) {
        disposeCallbacks.push(preloadImage(image.diffImg.path));
    }

    if (hasRefImage(image)) {
        disposeCallbacks.push(preloadImage(image.refImg.path));
    }

    return () => disposeCallbacks.forEach(dispose => dispose());
}
