import {Response} from 'express';
import _ from 'lodash';

import {ToolRunner, ToolRunnerTree, UndoAcceptImagesResult} from './tool-runner';
import {HtmlReporterApi} from '../types';
import type Testplane from 'hermione';
import type {Config} from 'hermione';
import {GuiConfigs} from './index';
import {TestSpec} from './tool-runner/runner/runner';
import {TestBranch, TestEqualDiffsData, TestRefUpdateData} from '../tests-tree-builder/gui';

type BrowserConfig = ReturnType<Config['forBrowser']>;

type AppArgs = [paths: string[], testplane: Testplane & HtmlReporterApi, configs: GuiConfigs];

export class App {
    private _toolRunner: ToolRunner;
    private _browserConfigs: BrowserConfig[];
    private _retryCache: Record<string, number>;

    static create<T extends App>(this: new (...args: AppArgs) => T, ...args: AppArgs): T {
        return new this(...args);
    }

    constructor(...[paths, testplane, configs]: AppArgs) {
        this._toolRunner = ToolRunner.create(paths, testplane, configs);

        this._browserConfigs = [];
        this._retryCache = {};
    }

    get data(): ToolRunnerTree | null {
        return this._toolRunner.tree;
    }

    async initialize(): Promise<void> {
        return await this._toolRunner.initialize();
    }

    async finalize(): Promise<void> {
        return this._toolRunner.finalize();
    }

    async run(tests: TestSpec[]): Promise<boolean> {
        return _.isEmpty(tests)
            ? this._toolRunner.run()
            : this._runWithoutRetries(tests);
    }

    private async _runWithoutRetries(tests: TestSpec[]): Promise<boolean> {
        if (_.isEmpty(this._browserConfigs)) {
            this._browserConfigs = _.map(this._toolRunner.config.getBrowserIds(), (id) => this._toolRunner.config.forBrowser(id));
        }

        this._disableRetries();

        return this._toolRunner.run(tests)
            .finally(() => this._restoreRetries());
    }

    getTestsDataToUpdateRefs(imageIds: string[] = []): TestRefUpdateData[] {
        return this._toolRunner.getTestsDataToUpdateRefs(imageIds);
    }

    getImageDataToFindEqualDiffs(imageIds: string[] = []): TestEqualDiffsData[] {
        return this._toolRunner.getImageDataToFindEqualDiffs(imageIds);
    }

    async updateReferenceImage(failedTests: TestRefUpdateData[] = []): Promise<TestBranch[]> {
        return this._toolRunner.updateReferenceImage(failedTests);
    }

    async undoAcceptImages(imageIds: TestRefUpdateData[]): Promise<UndoAcceptImagesResult> {
        return this._toolRunner.undoAcceptImages(imageIds);
    }

    async findEqualDiffs(data: TestEqualDiffsData[]): Promise<string[]> {
        return this._toolRunner.findEqualDiffs(data);
    }

    addClient(connection: Response): void {
        this._toolRunner.addClient(connection);
    }

    private _disableRetries(): void {
        this._browserConfigs.forEach((broConfig) => {
            this._retryCache[broConfig.id] = broConfig.retry;
            broConfig.retry = 0;
        });
    }

    private _restoreRetries(): void {
        this._browserConfigs.forEach((broConfig) => {
            broConfig.retry = this._retryCache[broConfig.id];
        });
    }
}
