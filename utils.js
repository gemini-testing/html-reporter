'use strict';

const _ = require('lodash');
const path = require('path');

const getReferencePath = (testResult) => createPath('ref', testResult);
const getCurrentPath = (testResult) => createPath('current', testResult);
const getDiffPath = (testResult) => createPath('diff', testResult);

const getReferenceAbsolutePath = (testResult, reportDir) => {
    const referenceImagePath = getReferencePath(testResult);

    return path.resolve(reportDir, referenceImagePath);
};

const getCurrentAbsolutePath = (testResult, reportDir) => {
    const currentImagePath = getCurrentPath(testResult);

    return path.resolve(reportDir, currentImagePath);
};

const getDiffAbsolutePath = (testResult, reportDir) => {
    const diffImagePath = getDiffPath(testResult);

    return path.resolve(reportDir, diffImagePath);
};

/**
 * @param {String} kind - одно из значение 'ref', 'current', 'diff'
 * @param {StateResult} result
 * @returns {String}
 */
function createPath(kind, result) {
    const retrySuffix = _.isUndefined(result.attempt) ? '' : `_${result.attempt}`;
    const components = [].concat(
        'images',
        result.suite.path,
        result.state.name,
        `${result.browserId}~${kind}${retrySuffix}.png`
    );
    const pathToImage = path.join.apply(null, components);

    return pathToImage;
}

module.exports = {
    getReferencePath,
    getCurrentPath,
    getDiffPath,

    getReferenceAbsolutePath,
    getCurrentAbsolutePath,
    getDiffAbsolutePath,

    logger: _.pick(console, ['log', 'warn', 'error'])
};
