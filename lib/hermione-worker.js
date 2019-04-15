'use strict';

const {Image} = require('gemini-core');
const crypto = require('crypto');
const fs = require('fs-extra');

// Need to cache the result of 'Image.buildDiff' because it is slow.
const cache = new Map();

module.exports = {
    /**
     * @param {ImageDiffError} imageDiffError
     * @param {String} diffPath
     * @param {Function} cb
     */
    saveDiffTo: async function(imageDiffError, diffPath, cb) {
        try {
            const curPath = imageDiffError.currImg.path;
            const refPath = imageDiffError.refImg.path;

            const [curBuffer, refBuffer] = await Promise.all([
                fs.readFile(curPath),
                fs.readFile(refPath)
            ]);

            const hash = createHash(curBuffer) + createHash(refBuffer);

            if (cache.has(hash)) {
                const cachedDiffPath = cache.get(hash);
                await fs.copy(cachedDiffPath, diffPath);
                return cb();
            }

            const diffBuffer = await Image.buildDiff({
                ...imageDiffError.diffOpts,
                current: curBuffer,
                reference: refBuffer
            });

            await fs.writeFile(diffPath, diffBuffer);

            cache.set(hash, diffPath);

            cb();
        } catch (e) {
            cb(e);
        }
    }
};

function createHash(buffer) {
    return crypto
        .createHash('sha1')
        .update(buffer)
        .digest('base64');
}
