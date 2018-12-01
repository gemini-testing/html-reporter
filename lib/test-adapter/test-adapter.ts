import {ITestResult, ITestTool} from 'typings/test-adapter';
import {SuiteAdapter} from 'lib/suite-adapter/suite-adapter';
import GeminiSuiteAdapter from 'lib/suite-adapter/gemini-suite-adapter';
import HermioneSuiteAdapter from 'lib/suite-adapter/hermione-suite-adapter';

export default class TestAdapter {
    protected _suite: SuiteAdapter | HermioneSuiteAdapter | GeminiSuiteAdapter;

    static create(testResult: ITestResult = {}, tool: ITestTool = {}): TestAdapter {
        return new this(testResult, tool);
    }

    constructor(
        protected _testResult: ITestResult,
        protected _tool: ITestTool
    ) {}

    get suite() {
        return this._suite;
    }

    get sessionId() {
        return this._testResult.sessionId || 'unknown session id';
    }

    get browserId() {
        return this._testResult.browserId;
    }

    get imagesInfo() {
        return this._testResult.imagesInfo;
    }

    set imagesInfo(imagesInfo) {
        this._testResult.imagesInfo = imagesInfo;
    }
}
