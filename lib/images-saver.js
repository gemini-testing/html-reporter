'use strict';

const utils = require('./server-utils');

module.exports = {
    saveImg: async (srcCurrPath, {destPath, reportDir}) => {
        await utils.copyImageAsync(srcCurrPath, destPath, reportDir);

        return destPath;
    }
};
