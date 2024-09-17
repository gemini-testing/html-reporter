import {isUrl} from '@/common-utils';

// To prevent image caching.
export function addTimestamp(imagePath: string): string {
    return `${imagePath}?t=${Date.now()}`;
}

// Since local filenames may contain special characters like %, they need to be encoded.
export function encodePathSegments(imagePath: string): string {
    if (isUrl(imagePath)) {
        return imagePath;
    }

    return imagePath
        // we can't use path.sep here because on Windows browser returns '/' instead of '\\'
        .split(/[/\\]/)
        .map((item) => encodeURIComponent(item))
        .join('/');
}
