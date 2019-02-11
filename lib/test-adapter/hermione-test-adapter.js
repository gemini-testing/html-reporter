'use strict';

const _ = require('lodash');
const TestAdapter = require('./test-adapter');
const HermioneSuiteAdapter = require('../suite-adapter/hermione-suite-adapter.js');
const {getSuitePath} = require('../plugin-utils').getHermioneUtils();
const {getImagesFor} = require('../server-utils');
const {SUCCESS, FAIL, ERROR} = require('../constants/test-statuses');

module.exports = class HermioneTestResultAdapter extends TestAdapter {
    constructor(testResult, tool) {
        super(testResult);
        this._tool = tool;
        this._errors = this._tool.errors;

        if (!Array.isArray(this._testResult.err)) {
            if (!this._testResult.err) {
                this._testResult.err = [];
            } else if (this._testResult.err.hasOwnProperty('errors')) {
                this._testResult.err = this._testResult.err.errors;
            } else {
                this._testResult.err = [this._testResult.err];
            }
        }
        this._suite = HermioneSuiteAdapter.create(this._testResult);
    }

    hasDiff() {
        return this.assertViewResults.some((result) => this.isImageDiffError(result));
    }

    get assertViewResults() {
        return this._testResult.assertViewResults || [];
    }

    isImageDiffError(assertResult) {
        return assertResult instanceof this._errors.ImageDiffError;
    }

    isNoRefImageError(assertResult) {
        return assertResult instanceof this._errors.NoRefImageError;
    }

    getImagesInfo() {
        if (!_.isEmpty(this.imagesInfo)) {
            return this.imagesInfo;
        }

        this.imagesInfo = this.assertViewResults.map((assertResult) => {
            let status, error;

            if (!(assertResult instanceof Error)) {
                status = SUCCESS;
            }

            if (this.isImageDiffError(assertResult)) {
                status = FAIL;
            }

            if (this.isNoRefImageError(assertResult)) {
                status = ERROR;
                error = _.pick(assertResult, ['message', 'stack']);
            }

            const {stateName, refImg} = assertResult;

            return _.extend({stateName, refImg, status, error}, getImagesFor(status, this, stateName));
        });

        // only one error can have screenshot
        for (const err of this._testResult.err) {
            if (err.screenshot) {
                const errorImage = _.extend(
                    {
                        status: ERROR,
                        error: _.pick(err, ['message', 'stack'])
                    },
                    getImagesFor(ERROR, this)
                );

                this.imagesInfo.push(errorImage);
            }
        }
        return this.imagesInfo;
    }

    get error() {
        return this._testResult.err
            .filter(e => !e.screenshot && e.name !== 'AssertViewError')
            .map(e => _.pick(e, ['message', 'stack', 'stateName']));
    }

    get imageDir() {
        return this._testResult.id();
    }

    get state() {
        return {name: this._testResult.title};
    }

    get attempt() {
        if (this._testResult.attempt >= 0) {
            return this._testResult.attempt;
        }

        const {retry} = this._tool.config.forBrowser(this._testResult.browserId);
        return this._testResult.retriesLeft >= 0
            ? retry - this._testResult.retriesLeft - 1
            : retry;
    }

    // for correct determine image paths in gui
    set attempt(attemptNum) {
        this._testResult.attempt = attemptNum;
    }

    get screenshot() {
        for (const error of this._testResult.err) {
            if (error.screenshot) {
                return error.screenshot;
            }
        }
        return null;
    }

    get description() {
        return this._testResult.description;
    }

    get meta() {
        return this._testResult.meta;
    }

    getRefImg(stateName) {
        return _.get(_.find(this.assertViewResults, {stateName}), 'refImg', {});
    }

    getCurrImg(stateName) {
        return _.get(_.find(this.assertViewResults, {stateName}), 'currImg', {});
    }

    getErrImg() {
        return this.screenshot || {};
    }

    prepareTestResult() {
        const {title: name, browserId} = this._testResult;
        const suitePath = getSuitePath(this._testResult);

        return {name, suitePath, browserId};
    }

    get multipleTabs() {
        return true;
    }
};
