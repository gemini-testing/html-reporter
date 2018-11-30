const _ = require('lodash');
import TestAdapter from './test-adapter';
import HermioneSuiteAdapter from '../suite-adapter/hermione-suite-adapter';

import {getHermioneUtils} from '../plugin-utils';
const {getSuitePath} = getHermioneUtils();

import {getPathsFor} from '../server-utils';
import { ITestResult, ITestTool } from 'typings/test-adapter';

const {SUCCESS, FAIL, ERROR} = require('../constants/test-statuses');

module.exports = class HermioneTestResultAdapter extends TestAdapter {
    protected _errors: any;

    static create(testResult: ITestResult, tool: ITestTool): HermioneTestResultAdapter {
        return new this(testResult, tool);
    }

    constructor(
        protected _testResult: ITestResult = {},
        protected _tool: ITestTool = {}
    ) {
        super(_testResult, _tool);

        this._errors = this._tool.errors;
        this._suite = HermioneSuiteAdapter.create(this._testResult);
    }

    hasDiff() {
        return this.assertViewResults && this.assertViewResults.some((result: any) => this.isImageDiffError(result));
    }

    get assertViewResults() {
        return this._testResult.assertViewResults;
    }

    isImageDiffError(assertResult: any) {
        return assertResult instanceof this._errors.ImageDiffError;
    }

    isNoRefImageError(assertResult: any) {
        return assertResult instanceof this._errors.NoRefImageError;
    }

    getImagesInfo() {
        if (!_.isEmpty(this.imagesInfo)) {
            return this.imagesInfo;
        }

        this.imagesInfo = this.assertViewResults && this.assertViewResults.map((assertResult) => {
            let status;
            let reason;

            if (!(assertResult instanceof Error)) {
                status = SUCCESS;
            }

            if (this.isImageDiffError(assertResult)) {
                status = FAIL;
            }

            if (this.isNoRefImageError(assertResult)) {
                status = ERROR;
                reason = _.pick(assertResult, ['message', 'stack']);
            }

            const {stateName, refImagePath} = assertResult;

            return _.extend({stateName, refImagePath, status, reason}, getPathsFor(status, this, stateName));
        });

        // common screenshot on test fail
        if (this.screenshot) {
            const errorImage = _.extend(
                {status: ERROR, reason: this.error},
                getPathsFor(ERROR, this)
            );

            this.imagesInfo && this.imagesInfo.push(errorImage);
        }

        return this.imagesInfo;
    }

    // hack which should be removed when html-reporter is able to show all assert view fails for one test
    get _firstAssertViewFail() {
        return _.find(this._testResult.assertViewResults, (result: Error | any) => result instanceof Error);
    }

    get error() {
        return _.pick(this._testResult.err, ['message', 'stack', 'stateName']);
    }

    get imageDir() {
        return this._testResult.id && this._testResult.id();
    }

    get state() {
        return {name: this._testResult.title};
    }

     get attempt() {
        if (this._testResult.attempt as number >= 0) {
            return this._testResult.attempt;
        }

        const {retry} = this._tool.config.forBrowser(this._testResult.browserId);
        return this._testResult.retriesLeft as number >= 0
            ? retry - (this._testResult.retriesLeft as number) - 1
            : retry;
    }

    // for correct determine image paths in gui
    set attempt(attemptNum) {
        this._testResult.attempt = attemptNum;
    }

    get screenshot() {
        return _.get(this._testResult, 'err.screenshot');
    }

    get assertViewState() {
        return this._firstAssertViewFail
            ? _.get(this._firstAssertViewFail, 'stateName')
            : _.get(this._testResult, 'err.stateName');
    }

    get description() {
        return this._testResult.description;
    }

    get meta() {
        return this._testResult.meta;
    }

    getImagePath(stateName: string) {
        return (_.find(this.imagesInfo, {stateName}) || {}).imagePath;
    }

    prepareTestResult() {
        const {title: name, browserId} = this._testResult;
        // TODO: create typings for that func, and delete "as"
        const suitePath = (getSuitePath as any)(this._testResult);

        return {name, suitePath, browserId};
    }

    get multipleTabs() {
        return true;
    }
};
