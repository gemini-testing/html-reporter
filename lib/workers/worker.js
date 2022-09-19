'use strict';

const looksSame = require('looks-same');

module.exports = {
    /**
     * @param {Object} imageDiffError
     * @param {String} diffPath
     */
    saveDiffTo: function(imageDiffError, diffPath) {
        const {diffColor: highlightColor, ...otherOpts} = imageDiffError.diffOpts;

        return looksSame.createDiff({diff: diffPath, highlightColor, ...otherOpts});
    }
};
