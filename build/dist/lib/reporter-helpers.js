'use strict';
var path = require('path');
var fs = require('fs-extra');
var _ = require('lodash');
var Promise = require('bluebird');
var utils = require('./server-utils');
function saveAssertViewImages(testResult, reportPath) {
    return Promise.map(testResult.assertViewResults, function (assertResult) {
        var stateName = assertResult.stateName;
        var actions = [];
        if (!(assertResult instanceof Error)) {
            actions.push(utils.copyImageAsync(assertResult.refImagePath, utils.getReferenceAbsolutePath(testResult, reportPath, stateName)));
        }
        if (testResult.isImageDiffError(assertResult)) {
            actions.push(exports.saveTestCurrentImage(testResult, reportPath, stateName), utils.saveDiff(assertResult, utils.getDiffAbsolutePath(testResult, reportPath, stateName)), utils.copyImageAsync(assertResult.refImagePath, utils.getReferenceAbsolutePath(testResult, reportPath, stateName)));
        }
        if (testResult.isNoRefImageError(assertResult)) {
            actions.push(exports.saveTestCurrentImage(testResult, reportPath, stateName));
        }
        return Promise.all(actions);
    });
}
exports.saveTestImages = function (testResult, reportPath) {
    if (testResult.assertViewResults) {
        return saveAssertViewImages(testResult, reportPath);
    }
    var actions = [
        utils.copyImageAsync(testResult.referencePath, utils.getReferenceAbsolutePath(testResult, reportPath))
    ];
    if (testResult.hasDiff()) {
        actions.push(exports.saveTestCurrentImage(testResult, reportPath), utils.saveDiff(testResult, utils.getDiffAbsolutePath(testResult, reportPath)));
    }
    return Promise.all(actions);
};
exports.saveTestCurrentImage = function (testResult, reportPath, stateName) {
    var src;
    if (stateName) {
        src = _.find(testResult.assertViewResults, { stateName: stateName }).currentImagePath;
    }
    else {
        src = testResult.getImagePath() || testResult.currentPath || testResult.screenshot;
    }
    return src
        ? utils.copyImageAsync(src, utils.getCurrentAbsolutePath(testResult, reportPath, stateName))
        : Promise.resolve();
};
exports.updateReferenceImage = function (testResult, reportPath, stateName) {
    var src = testResult.actualPath
        ? path.resolve(reportPath, testResult.actualPath)
        : utils.getCurrentAbsolutePath(testResult, reportPath, stateName);
    return Promise.all([
        utils.copyImageAsync(src, testResult.getImagePath(stateName)),
        utils.copyImageAsync(src, utils.getReferenceAbsolutePath(testResult, reportPath, stateName))
    ]);
};
exports.saveBase64Screenshot = function (testResult, reportPath) {
    if (!testResult.screenshot) {
        utils.logger.warn('Cannot save screenshot on reject');
        return Promise.resolve();
    }
    var destPath = utils.getCurrentAbsolutePath(testResult, reportPath);
    return utils.makeDirFor(destPath)
        .then(function () { return fs.writeFileAsync(destPath, new Buffer(testResult.screenshot, 'base64'), 'base64'); });
};
//# sourceMappingURL=reporter-helpers.js.map