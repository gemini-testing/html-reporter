'use strict';

const {Image} = require('gemini-core');

module.exports = {
    /**
     * @param {Object} imageDiffError
     * @param {String} diffPath
     * @param {Function} cb
     */
    saveDiffTo: async function(imageDiffError, diffPath, cb) {
        let result;
        try {
            result = await Image.buildDiff({diff: diffPath, ...imageDiffError.diffOpts});
        } catch (e) {
            return cb(e);
        }
        cb(null, result);
    }
};
