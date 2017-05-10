'use strict';

const Handlebars = require('handlebars');
const Promise = require('bluebird');
const fs = require('fs-extra');
const path = require('path');

const logger = require('../utils').logger;
const ViewModel = require('./view-model');

const makeOutFilePath = (reportDir, fileName) => path.join(reportDir, fileName);

const pathToUrl = (filePath) => filePath.split(path.sep).map((item) => encodeURIComponent(item)).join('/');

Handlebars.registerHelper('section-status', function() {
    if (this.result && this.result.skipped) {
        return 'section_status_skip';
    }

    if (ViewModel.hasFails(this)) {
        return 'section_status_fail';
    }

    return 'section_status_success';
});

Handlebars.registerHelper('image-box-status', function() {
    const result = this.result;

    if (result.error) {
        return 'image-box_error';
    }

    return '';
});

Handlebars.registerHelper('has-retries', function() {
    return ViewModel.hasRetries(this) ? 'has-retries' : '';
});

Handlebars.registerHelper('has-fails', function() {
    return this.failed > 0 ? 'summary__key_has-fails' : '';
});

Handlebars.registerHelper('image', function(kind) {
    const url = pathToUrl(this[kind + 'Path']);
    return new Handlebars.SafeString('<img data-src="' + url + '">');
});

Handlebars.registerHelper('inc', function(value) {
    return parseInt(value) + 1;
});

function loadTemplate(name) {
    return fs.readFileAsync(path.join(__dirname, 'templates', name), 'utf8');
}

function copyToReportDir(reportDir, fileName) {
    return fs.copyAsync(path.join(__dirname, 'static', fileName), makeOutFilePath(reportDir, fileName));
}

module.exports = {
    /**
     * @param {ViewModelResult} model
     * @returns {Promise}
     */
    createHtml: (model) => {
        return Promise.all([
            loadTemplate('suite.hbs'),
            loadTemplate('state.hbs'),
            loadTemplate('report.hbs')
        ])
         .spread((suiteTemplate, stateTemplate, reportTemplate) => {
             Handlebars.registerPartial('suite', suiteTemplate);
             Handlebars.registerPartial('state', stateTemplate);

             return Handlebars.compile(reportTemplate, {preventIndent: true})(model);
         });
    },

    /**
     * @param {String} html
     * @param {String} reportDir
     * @returns {Promise}
     */
    save: (html, reportDir) => {
        return fs.mkdirsAsync(reportDir)
            .then(() => Promise.all([
                fs.writeFileAsync(makeOutFilePath(reportDir, 'index.html'), html, 'utf8'),
                copyToReportDir(reportDir, 'report.min.js'),
                copyToReportDir(reportDir, 'report.css')
            ]))
            .catch((e) => logger.log(e.message || e));
    }
};
