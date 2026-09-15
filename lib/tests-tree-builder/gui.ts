import _ from 'lodash';
import path from 'node:path';
import {BaseTestsTreeBuilder, Tree, TreeImage, TreeTestResult, TreeSuite} from './base';
import {TestStatus, UPDATED} from '../constants';
import {isUpdatedStatus} from '../common-utils';
import {ImageFile, ImageInfoWithState} from '../types';
import type {ReporterTestResult} from '../adapters/test-result';
import type {TreePatchScope} from './tree-patch';

interface SuiteBranch {
    id: string;
    status?: TestStatus;
}

export interface TestBranch {
    result: TreeTestResult;
    images: TreeImage[];
    suites: SuiteBranch[];
}

export interface TestRefUpdateData {
    browserId: string;
    error?: TreeTestResult['error'];
    suite: {path: string[]};
    state: {name: string};
    metaInfo: TreeTestResult['metaInfo'];
    imagesInfo: {
        stateName: string;
        actualImg: ImageFile;
        status: TestStatus;
    }[];
    attempt: number;
}

export type TestEqualDiffsData = TreeImage & { browserName: string };

export interface GuiTestsTreeBuilderState {
    tree: Tree;
    browserIdsByFile: Map<string, Set<string>>;
    scope?: TreePatchScope;
    files?: string[];
}

interface TestUndoRefUpdateData {
    imageId: string;
    status: TestStatus;
    timestamp: number;
    previousImage: TreeImage | null;
    previousImageId: string | null;
    shouldRemoveResult: boolean;
}

export class GuiTestsTreeBuilder extends BaseTestsTreeBuilder {
    private _browserIdsByFile = new Map<string, Set<string>>();

    snapshotState(scope?: TreePatchScope, files?: Iterable<string>): GuiTestsTreeBuilderState {
        const getEntries = <T>(byId: Record<string, T>, ids?: Set<string>): [string, T][] => ids
            ? [...ids].flatMap(id => byId[id] ? [[id, byId[id]] as [string, T]] : [])
            : Object.entries(byId);
        const suitesById = Object.fromEntries(getEntries(this._tree.suites.byId, scope?.suites).map(([id, suite]) => [id, {
            ...suite,
            suitePath: [...suite.suitePath],
            suiteIds: suite.suiteIds && [...suite.suiteIds],
            browserIds: suite.browserIds && [...suite.browserIds]
        }]));
        const normalizedFiles = files && [...files].map(file => path.resolve(file));
        const browserIdsByFileEntries = normalizedFiles
            ? normalizedFiles.flatMap(file => this._browserIdsByFile.has(file) ? [[file, this._browserIdsByFile.get(file) as Set<string>] as const] : [])
            : [...this._browserIdsByFile];

        return {
            tree: {
                suites: {
                    byId: suitesById,
                    byHash: Object.fromEntries(Object.values(suitesById).map(suite => [suite.hash, suite])),
                    allIds: [...this._tree.suites.allIds],
                    allRootIds: [...this._tree.suites.allRootIds]
                },
                browsers: {
                    byId: Object.fromEntries(getEntries(this._tree.browsers.byId, scope?.browsers).map(([id, browser]) => [id, {
                        ...browser,
                        resultIds: [...browser.resultIds]
                    }])),
                    allIds: [...this._tree.browsers.allIds]
                },
                results: {
                    byId: Object.fromEntries(getEntries(this._tree.results.byId, scope?.results)),
                    allIds: [...this._tree.results.allIds]
                },
                images: {
                    byId: Object.fromEntries(getEntries(this._tree.images.byId, scope?.images)),
                    allIds: [...this._tree.images.allIds]
                }
            },
            browserIdsByFile: new Map(browserIdsByFileEntries.map(([file, ids]) => [file, new Set(ids)])),
            scope,
            files: normalizedFiles
        };
    }

    restoreState({tree, browserIdsByFile, scope, files}: GuiTestsTreeBuilderState): void {
        if (!scope) {
            this._tree = tree;
            this._browserIdsByFile = browserIdsByFile;

            return;
        }

        const restoreById = <T>(current: Record<string, T>, previous: Record<string, T>, ids: Set<string>): void => {
            for (const id of ids) {
                if (previous[id]) {
                    current[id] = previous[id];
                } else {
                    delete current[id];
                }
            }
        };

        for (const suiteId of scope.suites) {
            const currentSuite = this._tree.suites.byId[suiteId];

            if (currentSuite) {
                delete this._tree.suites.byHash[currentSuite.hash];
            }
        }
        restoreById(this._tree.suites.byId, tree.suites.byId, scope.suites);
        Object.assign(this._tree.suites.byHash, tree.suites.byHash);
        restoreById(this._tree.browsers.byId, tree.browsers.byId, scope.browsers);
        restoreById(this._tree.results.byId, tree.results.byId, scope.results);
        restoreById(this._tree.images.byId, tree.images.byId, scope.images);
        this._tree.suites.allIds = tree.suites.allIds;
        this._tree.suites.allRootIds = tree.suites.allRootIds;
        this._tree.browsers.allIds = tree.browsers.allIds;
        this._tree.results.allIds = tree.results.allIds;
        this._tree.images.allIds = tree.images.allIds;

        for (const file of files ?? []) {
            this._browserIdsByFile.delete(file);
        }
        for (const [file, ids] of browserIdsByFile) {
            this._browserIdsByFile.set(file, ids);
        }
    }

    addTestResult(formattedResult: ReporterTestResult): void {
        super.addTestResult(formattedResult);

        const file = formattedResult.file;
        if (typeof file !== 'string') {
            return;
        }

        const browserId = this._buildId(this._buildId(formattedResult.testPath), formattedResult.browserId);
        const normalizedFile = path.resolve(file);
        const browserIds = this._browserIdsByFile.get(normalizedFile) ?? new Set<string>();
        browserIds.add(browserId);
        this._browserIdsByFile.set(normalizedFile, browserIds);
    }

    removeTestsByFiles(files: string[]): void {
        const normalizedFiles = new Set(files.map(file => path.resolve(file)));
        const browserIds = new Set([...normalizedFiles].flatMap(file => [...this._browserIdsByFile.get(file) ?? []]));
        const resultIds = new Set<string>();
        const imageIds = new Set<string>();
        const affectedSuiteIds = new Set<string>();

        for (const browserId of browserIds) {
            const browser = this._tree.browsers.byId[browserId];

            if (!browser) {
                continue;
            }

            affectedSuiteIds.add(browser.parentId);
            for (const resultId of browser.resultIds.filter(Boolean)) {
                resultIds.add(resultId);
                this._tree.results.byId[resultId]?.imageIds.forEach(imageId => imageIds.add(imageId));
            }
            delete this._tree.browsers.byId[browserId];
        }

        for (const resultId of resultIds) {
            delete this._tree.results.byId[resultId];
        }
        for (const imageId of imageIds) {
            delete this._tree.images.byId[imageId];
        }

        this._tree.browsers.allIds = this._tree.browsers.allIds.filter(id => !browserIds.has(id));
        this._tree.results.allIds = this._tree.results.allIds.filter(id => !resultIds.has(id));
        this._tree.images.allIds = this._tree.images.allIds.filter(id => !imageIds.has(id));

        for (const suiteId of affectedSuiteIds) {
            const suite = this._tree.suites.byId[suiteId];

            if (suite?.browserIds) {
                suite.browserIds = suite.browserIds.filter(id => !browserIds.has(id));
            }
        }

        this._pruneEmptySuitesOrUpdateStatuses(affectedSuiteIds);

        normalizedFiles.forEach(file => this._browserIdsByFile.delete(file));
    }

    sortBranches(suiteIds: Iterable<string>): void {
        let shouldSortRootIds = false;

        for (const suiteId of suiteIds) {
            const suite = this._tree.suites.byId[suiteId];

            if (!suite) {
                continue;
            }

            shouldSortRootIds ||= suite.root;
            suite.suiteIds?.sort();
            suite.browserIds?.sort();
        }

        if (shouldSortRootIds) {
            this._tree.suites.allRootIds.sort();
        }
    }

    private _pruneEmptySuitesOrUpdateStatuses(affectedSuiteIds: Set<string>): void {
        const suiteIdsToRemove = new Set<string>();
        const candidateSuiteIds = new Set(affectedSuiteIds);

        for (const affectedSuiteId of affectedSuiteIds) {
            let parentId = this._tree.suites.byId[affectedSuiteId]?.parentId;

            while (parentId) {
                candidateSuiteIds.add(parentId);
                parentId = this._tree.suites.byId[parentId]?.parentId;
            }
        }

        const deepestFirst = [...candidateSuiteIds].sort((left, right) =>
            (this._tree.suites.byId[right]?.suitePath.length ?? 0) - (this._tree.suites.byId[left]?.suitePath.length ?? 0));

        for (const suiteId of deepestFirst) {
            const suite = this._tree.suites.byId[suiteId];
            const hasRemainingChildSuite = suite?.suiteIds?.some(childId => !suiteIdsToRemove.has(childId));

            if (suite && !suite.browserIds?.length && !hasRemainingChildSuite) {
                suiteIdsToRemove.add(suiteId);
            }
        }

        const parentsToFilter = new Set<string>();
        for (const suiteId of suiteIdsToRemove) {
            const suite = this._tree.suites.byId[suiteId];

            if (!suite) {
                continue;
            }
            if (suite.parentId) {
                parentsToFilter.add(suite.parentId);
            }
            delete this._tree.suites.byHash[suite.hash];
            delete this._tree.suites.byId[suiteId];
        }
        for (const parentId of parentsToFilter) {
            const parent = this._tree.suites.byId[parentId];

            if (parent?.suiteIds) {
                parent.suiteIds = parent.suiteIds.filter(id => !suiteIdsToRemove.has(id));
            }
        }

        if (suiteIdsToRemove.size) {
            this._tree.suites.allIds = this._tree.suites.allIds.filter(id => !suiteIdsToRemove.has(id));
            this._tree.suites.allRootIds = this._tree.suites.allRootIds.filter(id => !suiteIdsToRemove.has(id));
        }

        for (const suiteId of deepestFirst) {
            const suite = this._tree.suites.byId[suiteId];

            if (suite) {
                this._setStatusForBranch(suite.suitePath);
            }
        }
    }

    getImagesInfo(testId: string): TreeImage[] {
        return this._tree.results.byId[testId].imageIds.map((imageId) => {
            return this._tree.images.byId[imageId];
        });
    }

    getTestBranch(id: string): TestBranch {
        const getSuites = (suite: TreeSuite): SuiteBranch[] => {
            if (suite.root) {
                return [{id: suite.id, status: suite.status}];
            }

            return _.flatten([
                getSuites(this._tree.suites.byId[suite.parentId as string]),
                {id: suite.id, status: suite.status}
            ]);
        };

        const result = this._tree.results.byId[id];
        const images = result.imageIds.map((imgId): TreeImage => this._tree.images.byId[imgId]);
        const browser = this._tree.browsers.byId[result.parentId];
        const suites = getSuites(this._tree.suites.byId[browser.parentId]);

        return {result, images, suites};
    }

    getTestsDataToUpdateRefs(imageIds: string[]): TestRefUpdateData[] {
        const imagesById = ([] as string[]).concat(imageIds).reduce<Record<string, TreeImage>>((acc, imgId) => {
            acc[imgId] = this._tree.images.byId[imgId];
            return acc;
        }, {});

        const imagesByResultId = _.groupBy(imagesById, 'parentId');

        return Object.keys(imagesByResultId).map((resultId) => {
            const result = this._tree.results.byId[resultId];
            const browser = this._tree.browsers.byId[result.parentId];
            const suite = this._tree.suites.byId[browser.parentId];

            const imagesInfo = imagesByResultId[resultId]
                .filter(treeImage => (treeImage as ImageInfoWithState).stateName)
                .map<TestRefUpdateData['imagesInfo'][number]>((treeImage) => ({
                    stateName: (treeImage as ImageInfoWithState).stateName as string,
                    actualImg: treeImage.actualImg as ImageFile,
                    status: UPDATED
                }));

            return {
                suite: {path: suite.suitePath.slice(0, -1)},
                state: {name: suite.name},
                browserId: browser.name,
                error: result.error,
                metaInfo: result.metaInfo,
                imagesInfo,
                attempt: result.attempt
            } satisfies TestRefUpdateData;
        });
    }

    getImageDataToFindEqualDiffs(imageIds: string[]): TestEqualDiffsData[] {
        return imageIds.map((imageId) => {
            const image = this._tree.images.byId[imageId];
            const result = this._tree.results.byId[image.parentId];
            const {name: browserName} = this._tree.browsers.byId[result.parentId];

            return {...image, browserName};
        });
    }

    getResultDataToUnacceptImage(resultId: string, stateName: string): TestUndoRefUpdateData | null {
        const imageId = this._tree.results.byId[resultId].imageIds.find(imageId => {
            return (this._tree.images.byId[imageId] as ImageInfoWithState).stateName === stateName;
        });

        if (!imageId) {
            return null;
        }

        const image = this._tree.images.byId[imageId];
        const result = this._tree.results.byId[image.parentId];
        const browser = this._tree.browsers.byId[result.parentId];

        const previousResultId = browser.resultIds.find((_, ind, resultIds) => resultIds[ind + 1] === result.id);
        const previousResult = previousResultId ? this._tree.results.byId[previousResultId] : null;

        const previousImageId = previousResult
            ? previousResult.imageIds.find(imageId =>
                (this._tree.images.byId[imageId] as ImageInfoWithState).stateName ===
                (image as ImageInfoWithState).stateName) as string
            : null;
        const previousImage = previousImageId
            ? this._tree.images.byId[previousImageId]
            : null;

        const countUpdated = result.imageIds.reduce((acc, currImageId) => {
            return isUpdatedStatus(this._tree.images.byId[currImageId].status) ? acc + 1 : acc;
        }, 0);
        const shouldRemoveResult = isUpdatedStatus(image.status) && countUpdated === 1;

        return {
            imageId,
            status: image.status,
            timestamp: result.timestamp,
            previousImage,
            previousImageId,
            shouldRemoveResult
        };
    }

    reuseTestsTree(testsTree: Tree, {replaceCurrentResults = false}: {replaceCurrentResults?: boolean} = {}): void {
        this._tree.browsers.allIds.forEach((browserId) => this._reuseBrowser(testsTree, browserId, replaceCurrentResults));
    }

    updateImageInfo(imageId: string, imageInfo?: TreeImage | null): TreeImage {
        const currentImage = this._tree.images.byId[imageId];
        // TODO: check TreeImage type. Is it correct to let it consist of id and parentId?
        const updatedImage: TreeImage = {
            ...imageInfo,
            id: currentImage.id,
            parentId: currentImage.parentId
        } as TreeImage;

        this._tree.images.byId[imageId] = updatedImage;

        return updatedImage;
    }

    removeTestResult(resultId: string): void {
        const result = this._tree.results.byId[resultId];

        this._removeImagesById(result.imageIds);

        this._tree.browsers.byId[result.parentId].resultIds =
            this._tree.browsers.byId[result.parentId].resultIds.filter(id => id !== resultId);

        this._tree.results.allIds = this._tree.results.allIds.filter(id => id !== resultId);

        delete this._tree.results.byId[resultId];
    }

    private _removeImagesById(imageIds: string[]): void {
        this._tree.images.allIds = this._tree.images.allIds.filter(id => !imageIds.includes(id));

        imageIds.forEach(imageId => {
            delete this._tree.images.byId[imageId];
        });
    }

    private _reuseBrowser(testsTree: Tree, browserId: string, replaceCurrentResults: boolean): void {
        const reuseBrowser = testsTree.browsers.byId[browserId];

        if (!reuseBrowser) {
            return;
        }

        if (replaceCurrentResults) {
            const currentBrowser = this._tree.browsers.byId[browserId];
            currentBrowser.resultIds.filter(Boolean).forEach((resultId) => this.removeTestResult(resultId));
        }

        this._tree.browsers.byId[browserId] = reuseBrowser;

        reuseBrowser.resultIds.forEach((resultId) => this._reuseResults(testsTree, resultId));
        this._reuseSuiteStatus(testsTree, this._tree.browsers.byId[browserId].parentId);
    }

    private _reuseResults(testsTree: Tree, resultId: string): void {
        const reuseResult = testsTree.results.byId[resultId];

        if (!this._tree.results.byId[resultId]) {
            this._tree.results.allIds.push(resultId);
        }

        this._tree.results.byId[resultId] = reuseResult;

        reuseResult.imageIds.forEach((imageId) => this._reuseImages(testsTree, imageId));
    }

    private _reuseImages(testsTree: Tree, imageId: string): void {
        const reuseImage = testsTree.images.byId[imageId];

        if (!this._tree.images.byId[imageId]) {
            this._tree.images.allIds.push(imageId);
        }

        this._tree.images.byId[imageId] = reuseImage;
    }

    _reuseSuiteStatus(testsTree: Tree, suiteId?: string | null): void {
        if (!suiteId) {
            return;
        }

        const suite = this._tree.suites.byId[suiteId];
        suite.status = testsTree.suites.byId[suiteId].status;

        this._reuseSuiteStatus(testsTree, suite.parentId);
    }
}
