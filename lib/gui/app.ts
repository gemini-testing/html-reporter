import type {Response} from 'express';

import {ToolRunner, ToolRunnerTree, UndoAcceptImagesResult} from './tool-runner';
import {TestBranch, TestEqualDiffsData, TestRefUpdateData} from '../tests-tree-builder/gui';

import type {ServerArgs} from './index';
import type {TestSpec} from '../adapters/tool/types';

export class App {
    private _toolRunner: ToolRunner;

    static create<T extends App>(this: new (args: ServerArgs) => T, args: ServerArgs): T {
        return new this(args);
    }

    constructor(args: ServerArgs) {
        this._toolRunner = ToolRunner.create(args);
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
        return this._toolRunner.run(tests);
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
}
