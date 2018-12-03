import {ISuite} from 'typings/suite-adapter';
import { ITestResult, ITestTool } from 'typings/test-adapter';

module.exports = class TestAdapter {
    protected _suite: ISuite;

    static create(testResult: ITestResult = {}, tool: ITestTool) {
        return new this(testResult, tool);
    }

    constructor(
        protected _testResult: ITestResult,
        protected _tool: ITestTool
    ) {}

    get suite() {
        return this._suite;
    }

    get sessionId(): string {
        return this._testResult.sessionId || 'unknown session id';
    }

    get browserId(): string {
        return this._testResult.browserId as string;
    }

    get imagesInfo() {
        return this._testResult.imagesInfo;
    }

    set imagesInfo(imagesInfo) {
        this._testResult.imagesInfo = imagesInfo;
    }
};
