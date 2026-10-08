import fs from 'fs';
import {sync as probeImageSize} from 'probe-image-size';
import type {ImageSize} from './types';

const MAX_HEADER_SIZE = 512 * 1024;

export const getImageSize = (image: string | Buffer): ImageSize => {
    let buffer: Buffer;

    if (typeof image === 'string') {
        const descriptor = fs.openSync(image, 'r');
        try {
            buffer = Buffer.alloc(Math.min(fs.fstatSync(descriptor).size, MAX_HEADER_SIZE));
            fs.readSync(descriptor, buffer, 0, buffer.length, 0);
        } finally {
            fs.closeSync(descriptor);
        }
    } else {
        buffer = image;
    }

    const size = probeImageSize(buffer);
    if (!size) {
        throw new TypeError('Unsupported or invalid image');
    }

    return {width: size.width, height: size.height};
};
