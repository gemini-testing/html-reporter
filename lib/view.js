'use strict';

const Promise = require('bluebird');
const fs = require('fs-extra');
const path = require('path');
const logger = require('../utils').logger;

const makeOutFilePath = (reportDir, fileName) => path.join(reportDir, fileName);

function copyToReportDir(reportDir, files) {
    return Promise.map(files, (fileName) => {
        const from = path.resolve(__dirname, 'static', fileName);
        const to = makeOutFilePath(reportDir, fileName);

        return fs.copyAsync(from, to);
    });
}

function prepareData(data) {
    return [
        `var data = ${JSON.stringify(data)};`,
        'try { module.exports = data; } catch(e) {}'
    ].join('\n');
}

module.exports = {
    /**
     * @param {Object} data
     * @param {String} reportDir
     * @returns {Promise}
     */
    save: (data, reportDir) => {
        return fs.mkdirsAsync(reportDir)
            .then(() => Promise.all([
                fs.writeFileAsync(makeOutFilePath(reportDir, 'data.js'), prepareData(data), 'utf8'),
                copyToReportDir(reportDir, ['index.html', 'bundle.min.js', 'bundle.min.css'])
            ]))
            .catch((e) => logger.log(e.message || e));
    }
};
