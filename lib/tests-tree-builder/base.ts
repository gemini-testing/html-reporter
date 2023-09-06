import _ from 'lodash';
import {determineStatus} from '../common-utils';
import {TestStatus, BrowserVersions} from '../constants';
import {ReporterTestResult} from '../test-adapter';
import {ImageInfoFull, ParsedSuitesRow} from '../types';

type TreeResult = {
    id: string;
    parentId: string;
    status: TestStatus;
    imageIds: string[];
} & Omit<ParsedSuitesRow, 'imagesInfo'>;

interface TreeBrowser {
    id: string;
    name: string;
    parentId: string;
    resultIds: string[];
    version: string;
}

interface TreeSuite {
    status?: TestStatus;
    id: string;
    parentId: string | null;
    name: string;
    suitePath: string[];
    root: boolean;
    suiteIds?: string[];
    browserIds?: string[];
}

type TreeImages = {
    id: string;
    parentId: string;
} & ImageInfoFull;

export interface Tree {
    suites: {
        byId: Record<string, TreeSuite>,
        allIds: string[],
        allRootIds: string[]
    },
    browsers: {
        byId: Record<string, TreeBrowser>,
        allIds: string[]
    },
    results: {
        byId: Record<string, TreeResult>,
        allIds: string[]
    },
    images: {
        byId: Record<string, TreeImages>,
        allIds: string[]
    }
}

interface ResultPayload {
    id: string;
    parentId: string;
    result: ParsedSuitesRow;
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

export class BaseTestsTreeBuilder {
    protected _tree: Tree;

    static create<T extends BaseTestsTreeBuilder>(this: new () => T): T {
        return new this();
    }

    constructor() {
        this._tree = {
            suites: {byId: {}, allIds: [], allRootIds: []},
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

    addTestResult(testResult: ParsedSuitesRow, formattedResult: Pick<ReporterTestResult, 'testPath' | 'browserId' | 'attempt'>): void {
        const {testPath, browserId: browserName, attempt} = formattedResult;
        const {imagesInfo} = testResult;
        const {browserVersion = BrowserVersions.UNKNOWN} = testResult.metaInfo as {browserVersion: string};

        const suiteId = this._buildId(testPath);
        const browserId = this._buildId(suiteId, browserName);
        const testResultId = this._buildId(browserId, attempt.toString());
        const imageIds = imagesInfo
            .map((image: ImageInfoFull, i: number) => this._buildId(testResultId, image.stateName || `${image.status}_${i}`));

        this._addSuites(testPath, browserId);
        this._addBrowser({id: browserId, parentId: suiteId, name: browserName, version: browserVersion}, testResultId, attempt);
        this._addResult({id: testResultId, parentId: browserId, result: testResult}, imageIds);
        this._addImages(imageIds, {imagesInfo, parentId: testResultId});

        this._setStatusForBranch(testPath);
    }

    protected _buildId(parentId: string | string[] = [], name: string | string[] = []): string {
        return ([] as string[]).concat(parentId, name).join(' ');
    }

    protected _addSuites(testPath: string[], browserId: string): void {
        testPath.reduce((suites, name, ind, arr) => {
            const isRoot = ind === 0;
            const suitePath = isRoot ? [name] : arr.slice(0, ind + 1);
            const id = this._buildId(suitePath);

            if (!suites.byId[id]) {
                const parentId = isRoot ? null : this._buildId(suitePath.slice(0, -1));
                const suite: TreeSuite = {id, parentId, name, suitePath, root: isRoot};

                this._addSuite(suite);
            }

            if (ind !== arr.length - 1) {
                const childSuiteId = this._buildId(id, arr[ind + 1]);
                this._addNodeId(id, childSuiteId, {fieldName: 'suiteIds'});
            } else {
                this._addNodeId(id, browserId, {fieldName: 'browserIds'});
            }

            return suites;
        }, this._tree.suites);
    }

    protected _addSuite(suite: TreeSuite): void {
        const {suites} = this._tree;

        suites.byId[suite.id] = suite;
        suites.allIds.push(suite.id);

        if (suite.root) {
            suites.allRootIds.push(suite.id);
        }
    }

    protected _addNodeId(parentSuiteId: string, nodeId: string, {fieldName}: {fieldName: 'browserIds' | 'suiteIds'}): void {
        const {suites} = this._tree;

        if (!suites.byId[parentSuiteId][fieldName]) {
            suites.byId[parentSuiteId][fieldName] = [nodeId];
            return;
        }

        if (!this._isNodeIdExists(parentSuiteId, nodeId, {fieldName})) {
            suites.byId[parentSuiteId][fieldName]?.push(nodeId);
        }
    }

    protected _isNodeIdExists(parentSuiteId: string, nodeId: string, {fieldName}: {fieldName: 'browserIds' | 'suiteIds'}): boolean {
        return _.includes(this._tree.suites.byId[parentSuiteId][fieldName], nodeId);
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
        const resultWithoutImagesInfo = _.omit(result, 'imagesInfo');

        if (!this._tree.results.byId[id]) {
            this._tree.results.allIds.push(id);
        }

        this._tree.results.byId[id] = {id, parentId, ...resultWithoutImagesInfo, imageIds};
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

        const resultStatuses = _.compact(([] as (string | undefined)[]).concat(suite.browserIds))
            .map((browserId: string) => {
                const browser = this._tree.browsers.byId[browserId];
                const lastResultId = _.last(browser.resultIds) as string;

                return this._tree.results.byId[lastResultId].status;
            });

        const childrenSuiteStatuses = _.compact(([] as (string | undefined)[]).concat(suite.suiteIds))
            .map((childSuiteId: string) => this._tree.suites.byId[childSuiteId].status);

        const status = determineStatus(_.compact([...resultStatuses, ...childrenSuiteStatuses]));

        // if newly determined status is the same as current status, do nothing
        if (suite.status === status) {
            return;
        }

        suite.status = status || undefined;
        this._setStatusForBranch(testPath.slice(0, -1));
    }
}
