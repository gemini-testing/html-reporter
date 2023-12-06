import * as _ from 'lodash';
import {StaticReportBuilder} from './static';
import {GuiTestsTreeBuilder, TestBranch, TestEqualDiffsData, TestRefUpdateData} from '../tests-tree-builder/gui';
import {
    IDLE, RUNNING, UPDATED, TestStatus, DB_COLUMNS, ToolName
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
    removedResult: string | undefined;
    previousExpectedPath: string | null;
    shouldRemoveReference: boolean;
    shouldRevertReference: boolean;
    newTestResult: ReporterTestResult;
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

    addIdle(result: ReporterTestResult): ReporterTestResult {
        return this._addTestResult(result, {status: IDLE});
    }

    addRunning(result: ReporterTestResult): ReporterTestResult {
        return this._addTestResult(result, {status: RUNNING});
    }

    addSkipped(result: ReporterTestResult): ReporterTestResult {
        const formattedResult = super.addSkipped(result);
        const {
            fullName: suite,
            skipReason: comment,
            browserId: browser
        } = formattedResult;

        this._skips.push({suite, browser, comment});

        return formattedResult;
    }

    addUpdated(result: ReporterTestResult, failResultId: string): ReporterTestResult {
        return this._addTestResult(result, {status: UPDATED}, {failResultId});
    }

    setApiValues(values: HtmlReporterValues): this {
        this._apiValues = values;
        return this;
    }

    reuseTestsTree(tree: Tree): void {
        this._testsTree.reuseTestsTree(tree);
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

    undoAcceptImage(testResult: ReporterTestResult, stateName: string): UndoAcceptImageResult | null {
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

        let updatedImage: TreeImage | undefined, removedResult: string | undefined, newTestResult: ReporterTestResult;

        if (shouldRemoveResult) {
            this._testsTree.removeTestResult(resultId);
            this._testAttemptManager.removeAttempt(testResult);

            newTestResult = copyAndUpdate(testResult, {attempt: this._testAttemptManager.getCurrentAttempt(testResult)});

            removedResult = resultId;
        } else {
            updatedImage = this._testsTree.updateImageInfo(imageId, previousImage);

            newTestResult = testResult;
        }

        this._deleteTestResultFromDb({where: [
            `${DB_COLUMNS.SUITE_PATH} = ?`,
            `${DB_COLUMNS.NAME} = ?`,
            `${DB_COLUMNS.STATUS} = ?`,
            `${DB_COLUMNS.TIMESTAMP} = ?`,
            `json_extract(${DB_COLUMNS.IMAGES_INFO}, '$[0].stateName') = ?`
        ].join(' AND ')}, JSON.stringify(suitePath), browserName, status, timestamp.toString(), stateName);

        return {updatedImage, removedResult, previousExpectedPath, shouldRemoveReference, shouldRevertReference, newTestResult};
    }

    protected override _addTestResult(formattedResult: ReporterTestResult, props: {status: TestStatus} & Partial<PreparedTestResult>, opts: {failResultId?: string} = {}): ReporterTestResult {
        super._addTestResult(formattedResult, props);

        const testResult = this._createTestResult(formattedResult, {
            ...props,
            timestamp: formattedResult.timestamp ?? 0,
            attempt: formattedResult.attempt
        });

        this._extendTestWithImagePaths(testResult, formattedResult, opts);

        this._testsTree.addTestResult(testResult, formattedResult);

        return formattedResult;
    }

    private _extendTestWithImagePaths(testResult: PreparedTestResult, formattedResult: ReporterTestResult, opts: {failResultId?: string} = {}): void {
        const newImagesInfo = formattedResult.imagesInfo;

        if (testResult.status !== UPDATED) {
            _.set(testResult, 'imagesInfo', newImagesInfo);
            return;
        }

        const failImagesInfo = opts.failResultId ? this._testsTree.getImagesInfo(opts.failResultId) : [];

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
