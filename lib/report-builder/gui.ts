import * as _ from 'lodash';
import {StaticReportBuilder} from './static';
import {GuiTestsTreeBuilder, TestBranch, TestEqualDiffsData, TestRefUpdateData} from '../tests-tree-builder/gui';
import {
    IDLE, RUNNING, UPDATED, TestStatus, DB_COLUMNS, ToolName, HERMIONE_TITLE_DELIMITER
} from '../constants';
import {ConfigForStaticFile, getConfigForStaticFile} from '../server-utils';
import {ReporterTestResult} from '../test-adapter';
import {PreparedTestResult} from '../sqlite-client';
import {Tree, TreeImage} from '../tests-tree-builder/base';
import {ImageInfoWithState, ReporterConfig} from '../types';
import {isUpdatedStatus} from '../common-utils';
import {HtmlReporterValues} from '../plugin-api';
import {SkipItem} from '../tests-tree-builder/static';
import {copyAndUpdate} from '../test-adapter/utils';

interface UndoAcceptImageResult {
    updatedImage: TreeImage | undefined;
    removedResult: ReporterTestResult | undefined;
    previousExpectedPath: string | null;
    shouldRemoveReference: boolean;
    shouldRevertReference: boolean;
    newResult: ReporterTestResult;
}

export interface GuiReportBuilderResult {
    tree: Tree;
    skips: SkipItem[];
    config: ConfigForStaticFile & {customGui: ReporterConfig['customGui']};
    date: string;
    apiValues?: HtmlReporterValues;
}

export class GuiReportBuilder extends StaticReportBuilder {
    private _testsTree: GuiTestsTreeBuilder;
    private _skips: SkipItem[];
    private _apiValues?: HtmlReporterValues;

    constructor(...args: ConstructorParameters<typeof StaticReportBuilder>) {
        super(...args);

        this._testsTree = GuiTestsTreeBuilder.create({toolName: ToolName.Hermione});
        this._skips = [];
    }

    async addIdle(result: ReporterTestResult): Promise<ReporterTestResult> {
        return this._addTestResult(result, {status: IDLE});
    }

    async addRunning(result: ReporterTestResult): Promise<ReporterTestResult> {
        return this._addTestResult(result, {status: RUNNING});
    }

    override async addSkipped(result: ReporterTestResult): Promise<ReporterTestResult> {
        const formattedResult = await super.addSkipped(result);
        const {
            fullName: suite,
            skipReason: comment,
            browserId: browser
        } = formattedResult;

        this._skips.push({suite, browser, comment});

        return formattedResult;
    }

    async addUpdated(result: ReporterTestResult): Promise<ReporterTestResult> {
        return this._addTestResult(result, {status: UPDATED});
    }

    setApiValues(values: HtmlReporterValues): this {
        this._apiValues = values;
        return this;
    }

    reuseTestsTree(tree: Tree): void {
        this._testsTree.reuseTestsTree(tree);

        // Fill test attempt manager with data from db
        for (const [, testResult] of Object.entries(tree.results.byId)) {
            this._testAttemptManager.registerAttempt({
                fullName: testResult.suitePath.join(HERMIONE_TITLE_DELIMITER),
                browserId: testResult.name
            }, testResult.status, testResult.attempt);
        }
    }

    getResult(): GuiReportBuilderResult {
        const {customGui} = this._pluginConfig;
        const config = {...getConfigForStaticFile(this._pluginConfig), customGui};

        this._testsTree.sortTree();

        return {
            tree: this._testsTree.tree,
            skips: this._skips,
            config,
            date: new Date().toString(),
            apiValues: this._apiValues
        };
    }

    getTestBranch(id: string): TestBranch {
        return this._testsTree.getTestBranch(id);
    }

    getTestsDataToUpdateRefs(imageIds: string[]): TestRefUpdateData[] {
        return this._testsTree.getTestsDataToUpdateRefs(imageIds);
    }

    getImageDataToFindEqualDiffs(imageIds: string[]): TestEqualDiffsData[] {
        return this._testsTree.getImageDataToFindEqualDiffs(imageIds);
    }

    undoAcceptImage(testResultWithoutAttempt: ReporterTestResult, stateName: string): UndoAcceptImageResult | null {
        const attempt = this._testAttemptManager.getCurrentAttempt(testResultWithoutAttempt);
        const imagesInfoFormatter = this.imageHandler;
        const testResult = copyAndUpdate(testResultWithoutAttempt, {attempt}, {imagesInfoFormatter});

        const resultId = testResult.id;
        const suitePath = testResult.testPath;
        const browserName = testResult.browserId;
        const resultData = this._testsTree.getResultDataToUnacceptImage(resultId, stateName);

        if (!resultData || !isUpdatedStatus(resultData.status)) {
            return null;
        }

        const {
            imageId,
            status,
            timestamp,
            previousImage,
            shouldRemoveResult
        } = resultData;

        const previousExpectedPath = _.get(previousImage, 'expectedImg.path', null);
        const previousImageRefImgSize = _.get(previousImage, 'refImg.size', null);
        const shouldRemoveReference = _.isNull(previousImageRefImgSize);
        const shouldRevertReference = !shouldRemoveReference;

        let updatedImage: TreeImage | undefined, removedResult: ReporterTestResult | undefined;

        if (shouldRemoveResult) {
            this._testsTree.removeTestResult(resultId);
            this._testAttemptManager.removeAttempt(testResult);

            removedResult = testResult;
        } else {
            updatedImage = this._testsTree.updateImageInfo(imageId, previousImage);
        }

        const newResult = copyAndUpdate(testResult, {attempt: this._testAttemptManager.getCurrentAttempt(testResult)}, {imagesInfoFormatter});

        this._deleteTestResultFromDb({where: [
            `${DB_COLUMNS.SUITE_PATH} = ?`,
            `${DB_COLUMNS.NAME} = ?`,
            `${DB_COLUMNS.STATUS} = ?`,
            `${DB_COLUMNS.TIMESTAMP} = ?`,
            `json_extract(${DB_COLUMNS.IMAGES_INFO}, '$[0].stateName') = ?`
        ].join(' AND ')}, JSON.stringify(suitePath), browserName, status, timestamp.toString(), stateName);

        return {updatedImage, removedResult, previousExpectedPath, shouldRemoveReference, shouldRevertReference, newResult};
    }

    protected override async _addTestResult(formattedResultOriginal: ReporterTestResult, props: {status: TestStatus} & Partial<PreparedTestResult>): Promise<ReporterTestResult> {
        const formattedResult = await super._addTestResult(formattedResultOriginal, props);

        const testResult = this._createTestResult(formattedResult, {
            ...props,
            timestamp: formattedResult.timestamp ?? 0,
            attempt: formattedResult.attempt
        });

        this._extendTestWithImagePaths(testResult, formattedResult);

        this._testsTree.addTestResult(testResult, formattedResult);

        return formattedResult;
    }

    private _extendTestWithImagePaths(testResult: PreparedTestResult, formattedResult: ReporterTestResult): void {
        const newImagesInfo = formattedResult.imagesInfo;
        const imagesInfoFormatter = this._imageHandler;

        if (testResult.status !== UPDATED) {
            _.set(testResult, 'imagesInfo', newImagesInfo);
            return;
        }

        const failResultId = copyAndUpdate(formattedResult, {attempt: formattedResult.attempt - 1}, {imagesInfoFormatter}).id;
        const failImagesInfo = this._testsTree.getImagesInfo(failResultId);

        if (failImagesInfo.length) {
            testResult.imagesInfo = _.clone(failImagesInfo);

            newImagesInfo?.forEach((imageInfo) => {
                const {stateName} = imageInfo as ImageInfoWithState;
                let index = _.findIndex(testResult.imagesInfo, {stateName});
                index = index >= 0 ? index : _.findLastIndex(testResult.imagesInfo);
                testResult.imagesInfo[index] = imageInfo;
            });
        }
    }
}
