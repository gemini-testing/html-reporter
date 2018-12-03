import _ from 'lodash';
import path from 'path';
import GeminiSuiteAdapter from '../suite-adapter/gemini-suite-adapter';
import { ITestResult, ITestTool } from 'typings/test-adapter';
import { ISuite } from 'typings/suite-adapter';

const TestAdapter = require('./test-adapter');
const {getPathsFor} = require('../server-utils');
const {IDLE} = require('../constants/test-statuses');

module.exports = class GeminiTestResultAdapter extends TestAdapter {
    constructor(
        protected _testResult: ITestResult,
        protected _tool: ITestTool = {}
    ) {
        super(_testResult);

        this._suite = GeminiSuiteAdapter.create(this._testResult.suite as ISuite, _tool.config);
    }

    saveDiffTo(...args: string[]) {
        return this._testResult.saveDiffTo && this._testResult.saveDiffTo(...args);
    }

    hasDiff() {
        return this._testResult.hasOwnProperty('equal') && !this._testResult.equal;
    }

    getImagesInfo(status: string) {
        const reason = !_.isEmpty(this.error) && this.error;

        this.imagesInfo = status === IDLE
            ? [{status, expectedPath: this._testResult.referencePath}]
            : [].concat(_.extend({status, reason}, getPathsFor(status, this)));

        return this.imagesInfo;
    }

    get error() {
        return _.pick(this._testResult, ['message', 'stack']);
    }

    get imageDir() {
        const components = (new Array<string>()).concat(
            this._testResult.suite && this._testResult.suite.path || [],
            this._testResult.state && this._testResult.state.name || []
        );

        return path.join.apply(null, components);
    }

    get state() {
        return this._testResult.state;
    }

    get attempt() {
        return Number(this._testResult.attempt);
    }

    // for correct determine image paths in gui
    set attempt(attemptNum: number) {
        this._testResult.attempt = attemptNum;
    }

    get referencePath() {
        return this._testResult.referencePath;
    }

    get currentPath() {
        return this._testResult.currentPath;
    }

    getImagePath() {
        return this._testResult.imagePath;
    }

    prepareTestResult() {
        // @ts-ignore
        const {state: {name}, suite, browserId} = this._testResult;
        // @ts-ignore
        const suitePath = suite.path.concat(name);

        return {name, suitePath, browserId};
    }

    get multipleTabs() {
        return false;
    }
};
