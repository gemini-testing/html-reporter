'use strict';

const path = require('path');
const Promise = require('bluebird');
const utils = require('./server-utils');

exports.updateReferenceImage = (testResult, reportPath, stateName) => {
    const currImg = testResult.getCurrImg(stateName);

    const src = currImg.path
        ? path.resolve(reportPath, currImg.path)
        : utils.getCurrentAbsolutePath(testResult, reportPath, stateName);

    return Promise.all([
        utils.copyFileAsync(src, testResult.getRefImg(stateName).path),
        utils.copyFileAsync(src, utils.getReferenceAbsolutePath(testResult, reportPath, stateName))
    ]);
};
