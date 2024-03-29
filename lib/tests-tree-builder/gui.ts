import _ from 'lodash';
import {BaseTestsTreeBuilder, Tree, TreeImage, TreeTestResult, TreeSuite} from './base';
import {TestStatus, UPDATED} from '../constants';
import {isUpdatedStatus} from '../common-utils';
import {ImageFile, ImageInfoWithState} from '../types';

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

interface TestUndoRefUpdateData {
    imageId: string;
    status: TestStatus;
    timestamp: number;
    previousImage: TreeImage | null;
    previousImageId: string | null;
    shouldRemoveResult: boolean;
}

export class GuiTestsTreeBuilder extends BaseTestsTreeBuilder {
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

    reuseTestsTree(testsTree: Tree): void {
        this._tree.browsers.allIds.forEach((browserId) => this._reuseBrowser(testsTree, browserId));
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

    private _reuseBrowser(testsTree: Tree, browserId: string): void {
        const reuseBrowser = testsTree.browsers.byId[browserId];

        if (!reuseBrowser) {
            return;
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
