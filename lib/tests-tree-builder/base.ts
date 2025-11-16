import {determineFinalStatus, getShortMD5} from '../common-utils';
import {BrowserVersions, DEFAULT_TITLE_DELIMITER, TestStatus} from '../constants';
import {ReporterTestResult} from '../adapters/test-result';
import {ErrorDetails, ImageInfoFull} from '../types';
import {TreeTestResultTransformer} from '../adapters/test-result/transformers/tree';
import {DbTestResult} from '../sqlite-client';

export type BaseTreeTestResult = Omit<DbTestResult, 'imagesInfo'> & {
    attempt?: number;
    errorDetails?: ErrorDetails | null;
}

export interface TreeTestResult extends BaseTreeTestResult {
    id: string;
    parentId: string;
    imageIds: string[];
    attempt: number;
}

interface TreeBrowser {
    id: string;
    name: string;
    parentId: string;
    resultIds: string[];
    version: string;
}

export interface TreeSuite {
    status?: TestStatus;
    id: string;
    hash: string;
    parentId: string | null;
    name: string;
    suitePath: string[];
    root: boolean;
    suiteIds?: string[];
    browserIds?: string[];
}

export type TreeImage = {
    id: string;
    parentId: string;
} & ImageInfoFull;

export interface Tree {
    suites: {
        byId: Record<string, TreeSuite>;
        byHash: Record<string, TreeSuite>;
        allIds: string[];
        allRootIds: string[];
    },
    browsers: {
        byId: Record<string, TreeBrowser>,
        allIds: string[]
    },
    results: {
        byId: Record<string, TreeTestResult>,
        allIds: string[]
    },
    images: {
        byId: Record<string, TreeImage>,
        allIds: string[]
    }
}

interface ResultPayload {
    id: string;
    parentId: string;
    result: ReporterTestResult;
}

interface BrowserPayload {
    id: string;
    name: string;
    parentId: string;
    version: string;
}

interface ImagesPayload {
    imagesInfo: ImageInfoFull[];
    parentId: string;
}

export interface BaseTestsTreeBuilderOptions {
    baseHost?: string;
}

export class BaseTestsTreeBuilder {
    protected _tree: Tree;
    protected _transformer: TreeTestResultTransformer;

    static create<T extends BaseTestsTreeBuilder>(
        this: new (options: BaseTestsTreeBuilderOptions) => T,
        options: BaseTestsTreeBuilderOptions = {}
    ): T {
        return new this(options);
    }

    constructor(options: BaseTestsTreeBuilderOptions = {}) {
        this._transformer = new TreeTestResultTransformer(options);

        this._tree = {
            suites: {byId: {}, byHash: {}, allIds: [], allRootIds: []},
            browsers: {byId: {}, allIds: []},
            results: {byId: {}, allIds: []},
            images: {byId: {}, allIds: []}
        };
    }

    get tree(): Tree {
        return this._tree;
    }

    sortTree(): void {
        const sortChildSuites = (suiteId: string): void => {
            const childSuite = this._tree.suites.byId[suiteId];

            if (childSuite.suiteIds) {
                childSuite.suiteIds.sort().forEach(sortChildSuites);
            }

            if (childSuite.browserIds) {
                childSuite.browserIds.sort();
            }
        };

        this._tree.suites.allRootIds.sort().forEach(sortChildSuites);
    }

    addTestResult(formattedResult: ReporterTestResult): void {
        const {testPath, browserId: browserName, attempt, imagesInfo = []} = formattedResult;
        const {browserVersion = BrowserVersions.UNKNOWN} = formattedResult.meta as {browserVersion: string};

        const suiteId = this._buildId(testPath);
        const browserId = this._buildId(suiteId, browserName);
        const testResultId = this._buildId(browserId, attempt.toString());
        const imageIds = imagesInfo
            .map((image: ImageInfoFull, i: number) =>
                this._buildId(testResultId, (image as {stateName?: string}).stateName || `${image.status}_${i}`));

        this._addSuites(testPath, browserId);
        this._addBrowser({id: browserId, parentId: suiteId, name: browserName, version: browserVersion}, testResultId, attempt);
        this._addResult({id: testResultId, parentId: browserId, result: formattedResult}, imageIds);
        this._addImages(imageIds, {imagesInfo, parentId: testResultId});

        this._setStatusForBranch(testPath);
    }

    protected _buildId(parentId: string | string[] = [], name: string | string[] = []): string {
        return ([] as string[]).concat(parentId, name).join(DEFAULT_TITLE_DELIMITER);
    }

    protected _addSuites(testPath: string[], browserId: string): void {
        testPath.reduce((suites, name, ind, arr) => {
            const isRoot = ind === 0;
            const suitePath = isRoot ? [name] : arr.slice(0, ind + 1);
            const id = this._buildId(suitePath);

            if (!suites.byId[id]) {
                const parentId = isRoot ? null : this._buildId(suitePath.slice(0, -1));
                const hash = getShortMD5(id);
                const suite: TreeSuite = {id, hash, parentId, name, suitePath, root: isRoot};

                this._addSuite(suite);
            }

            const treeSuite = this._tree.suites.byId[id];

            if (ind !== arr.length - 1) {
                const childSuiteId = this._buildId(id, arr[ind + 1]);

                if (treeSuite.suiteIds) {
                    // We add suites from parent to child
                    // So if there is no child yet, its not present in "treeSuite.suiteIds"
                    // But it will in next iteration of this "reduce" cycle, which is synchronous
                    if (!this._tree.suites.byId[childSuiteId] || !treeSuite.suiteIds.includes(childSuiteId)) {
                        treeSuite.suiteIds.push(childSuiteId);
                    }
                } else {
                    treeSuite.suiteIds = [childSuiteId];
                }
            } else {
                if (treeSuite.browserIds) {
                    if (!this._tree.browsers.byId[browserId] || !treeSuite.browserIds.includes(browserId)) {
                        treeSuite.browserIds.push(browserId);
                    }
                } else {
                    treeSuite.browserIds = [browserId];
                }
            }

            return suites;
        }, this._tree.suites);
    }

    protected _addSuite(suite: TreeSuite): void {
        const {suites} = this._tree;

        suites.byId[suite.id] = suite;
        suites.byHash[suite.hash] = suite;
        suites.allIds.push(suite.id);

        if (suite.root) {
            suites.allRootIds.push(suite.id);
        }
    }

    protected _addBrowser({id, parentId, name, version}: BrowserPayload, testResultId: string, attempt: number): void {
        const {browsers} = this._tree;

        if (!browsers.byId[id]) {
            browsers.byId[id] = {id, parentId, name, resultIds: [], version};
            browsers.allIds.push(id);
        }

        this._addResultIdToBrowser(id, testResultId, attempt);
    }

    protected _addResultIdToBrowser(browserId: string, testResultId: string, attempt: number): void {
        this._tree.browsers.byId[browserId].resultIds[attempt] = testResultId;
    }

    protected _addResult({id, parentId, result}: ResultPayload, imageIds: string[]): void {
        const treeResult = this._transformer.transform(result);

        if (!this._tree.results.byId[id]) {
            this._tree.results.allIds.push(id);
        }

        this._tree.results.byId[id] = {attempt: 0, id, parentId, ...treeResult, imageIds};
    }

    protected _addImages(imageIds: string[], {imagesInfo, parentId}: ImagesPayload): void {
        imageIds.forEach((id, ind) => {
            this._tree.images.byId[id] = {...imagesInfo[ind], id, parentId};
            this._tree.images.allIds.push(id);
        });
    }

    protected _setStatusForBranch(testPath: string[] = []): void {
        const suiteId = this._buildId(testPath);

        if (!suiteId) {
            return;
        }

        const suite = this._tree.suites.byId[suiteId];
        const uniqueChildStatuses: TestStatus[] = [];

        for (const browserId of suite.browserIds || []) {
            if (!browserId) {
                continue;
            }

            const browserResultIds = this._tree.browsers.byId[browserId].resultIds;
            const lastResultId = browserResultIds[browserResultIds.length - 1];
            const lastResultStatus = this._tree.results.byId[lastResultId].status;

            if (lastResultStatus && !uniqueChildStatuses.includes(lastResultStatus)) {
                uniqueChildStatuses.push(lastResultStatus);
            }
        }

        for (const childSuiteId of suite.suiteIds || []) {
            if (!childSuiteId) {
                continue;
            }

            const childSuiteStatus = this._tree.suites.byId[childSuiteId].status;

            if (childSuiteStatus && !uniqueChildStatuses.includes(childSuiteStatus)) {
                uniqueChildStatuses.push(childSuiteStatus);
            }
        }

        // Updating parent suites status, implying "finalStatus(A, A, A, B) === finalStatus(A, B)"
        suite.status = determineFinalStatus(uniqueChildStatuses) || void 0;

        if (!suite.status) {
            return;
        }

        for (let i = 1; i < testPath.length; i++) {
            const parentTestPath = testPath.slice(0, -i);
            const parentSuiteId = this._buildId(parentTestPath);
            const parentSuite = this._tree.suites.byId[parentSuiteId];

            if (parentSuite.status === suite.status) {
                return;
            }

            if (!parentSuite.status) {
                parentSuite.status = suite.status;
                continue;
            } else {
                this._setStatusForBranch(parentTestPath);
                break;
            }
        }
    }
}
