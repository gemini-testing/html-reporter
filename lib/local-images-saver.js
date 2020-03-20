'use strict';

const utils = require('./server-utils');

module.exports = {
    saveImg: async (srcCurrPath, {destPath, reportDir}) => {
        await utils.copyFileAsync(srcCurrPath, destPath, reportDir);

        return destPath;
    }
};
