import fs from 'fs';
import os from 'os';
import path from 'path';
import {getImageSize} from 'lib/image-size';

describe('getImageSize', () => {
    const pngPath = path.resolve(__dirname, '../../../lib/static/icons/favicon.png');

    it('should read PNG dimensions from a file', () => {
        assert.deepEqual(getImageSize(pngPath), {width: 32, height: 32});
    });

    it('should read PNG dimensions from a buffer', () => {
        assert.deepEqual(getImageSize(fs.readFileSync(pngPath)), {width: 32, height: 32});
    });

    it('should read JPEG dimensions without decoding pixels', () => {
        const jpegHeader = Buffer.from('ffd8ffc00011080002000303011100021100031100ffd9', 'hex');

        assert.deepEqual(getImageSize(jpegHeader), {width: 3, height: 2});
    });

    it('should reject unsupported image files', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'html-reporter-image-size-'));
        const file = path.join(dir, 'invalid.png');
        fs.writeFileSync(file, 'not an image');

        try {
            assert.throws(() => getImageSize(file), TypeError);
        } finally {
            fs.rmSync(dir, {recursive: true, force: true});
        }
    });

    it('should reject an empty image', () => {
        assert.throws(() => getImageSize(Buffer.alloc(0)), TypeError);
    });

    it('should reject an ICNS header with a zero-length entry', () => {
        const icns = Buffer.from('69636e73000000100000000000000000', 'hex');

        assert.throws(() => getImageSize(icns), TypeError);
    });
});
