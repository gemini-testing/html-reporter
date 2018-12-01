import _ from 'lodash';
import path from 'path';

import GeminiSuiteAdapter from '../suite-adapter/gemini-suite-adapter';
import {getPathsFor} from '../server-utils';

const {IDLE} = require('../constants/test-statuses');

import TestAdapter from './test-adapter';
import { ITestResult, ITestTool } from 'typings/test-adapter';

module.exports = class GeminiTestResultAdapter extends TestAdapter {
    static create(testResult: ITestResult, tool: ITestTool): GeminiTestResultAdapter {
        return new this(testResult, tool);
    }

    constructor(
        protected _testResult: ITestResult = {},
        protected _tool: ITestTool = {}
    ) {
        super(_testResult, _tool);

        this._suite = GeminiSuiteAdapter.create(this._testResult.suite || {}, _tool.config);
    }

    saveDiffTo(...args: any[]) {
        return typeof this._testResult.saveDiffTo !== 'undefined' && this._testResult.saveDiffTo(...args);
    }

    hasDiff() {
        return this._testResult.hasOwnProperty('equal') && !this._testResult.equal;
    }

    getImagesInfo(status: string) {
        const reason = !_.isEmpty(this.error) && this.error;

        this.imagesInfo = status === IDLE
            ? [{status, expectedPath: this._testResult.referencePath}]
            : (new Array()).concat(_.extend({status, reason}, getPathsFor(status, this)));

        return this.imagesInfo;
    }

    get error() {
        return _.pick(this._testResult, ['message', 'stack']);
    }

    get imageDir() {
        const {suite, state} = this._testResult;

        const components: string[] = (new Array<string>()).concat(
                suite && suite.path || [],
                state && state.name || []
            );

        return path.join.apply(null, components);
    }

    get state() {
        return this._testResult.state;
    }

    get attempt(): number | undefined {
        return this._testResult.attempt;
    }

    // for correct determine image paths in gui
    set attempt(attemptNum: number | undefined) {
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
