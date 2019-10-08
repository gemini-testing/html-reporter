'use strict';

const {Image} = require('gemini-core');

module.exports = {
    /**
     * @param {Object} imageDiffError
     * @param {String} diffPath
     */
    saveDiffTo: function(imageDiffError, diffPath) {
        return Image.buildDiff({diff: diffPath, ...imageDiffError.diffOpts});
    }
};
