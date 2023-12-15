import _ from 'lodash';
import {StaticReportBuilder, StaticReportBuilderOptions} from './static';
import {GuiTestsTreeBuilder, TestBranch, TestEqualDiffsData, TestRefUpdateData} from '../tests-tree-builder/gui';
import {UPDATED, DB_COLUMNS, ToolName, HERMIONE_TITLE_DELIMITER, SKIPPED} from '../constants';
import {ConfigForStaticFile, getConfigForStaticFile} from '../server-utils';
import {ReporterTestResult} from '../test-adapter';
import {Tree, TreeImage} from '../tests-tree-builder/base';
import {ImageInfoFull, ImageInfoWithState, ReporterConfig} from '../types';
import {isUpdatedStatus} from '../common-utils';
import {HtmlReporter, HtmlReporterValues} from '../plugin-api';
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

    constructor(htmlReporter: HtmlReporter, pluginConfig: ReporterConfig, options: StaticReportBuilderOptions) {
        super(htmlReporter, pluginConfig, options);

        this._testsTree = GuiTestsTreeBuilder.create({toolName: ToolName.Hermione, baseHost: pluginConfig.baseHost});
        this._skips = [];
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
        const testResult = copyAndUpdate(testResultWithoutAttempt, {attempt});

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

        const newResult = copyAndUpdate(testResult, {attempt: this._testAttemptManager.getCurrentAttempt(testResult)});

        this._deleteTestResultFromDb({where: [
            `${DB_COLUMNS.SUITE_PATH} = ?`,
            `${DB_COLUMNS.NAME} = ?`,
            `${DB_COLUMNS.STATUS} = ?`,
            `${DB_COLUMNS.TIMESTAMP} = ?`,
            `json_extract(${DB_COLUMNS.IMAGES_INFO}, '$[0].stateName') = ?`
        ].join(' AND ')}, JSON.stringify(suitePath), browserName, status, timestamp.toString(), stateName);

        return {updatedImage, removedResult, previousExpectedPath, shouldRemoveReference, shouldRevertReference, newResult};
    }

    override async addTestResult(formattedResultOriginal: ReporterTestResult): Promise<ReporterTestResult> {
        const formattedResult = await super.addTestResult(formattedResultOriginal);

        if (formattedResult.status === SKIPPED) {
            const {
                fullName: suite,
                skipReason: comment,
                browserId: browser
            } = formattedResult;

            this._skips.push({suite, browser, comment});
        }

        const formattedResultWithImagePaths = this._extendTestWithImagePaths(formattedResult);

        this._testsTree.addTestResult(formattedResultWithImagePaths);

        return formattedResultWithImagePaths;
    }

    private _extendTestWithImagePaths(formattedResult: ReporterTestResult): ReporterTestResult {
        if (formattedResult.status !== UPDATED) {
            return formattedResult;
        }

        const failResultId = copyAndUpdate(formattedResult, {attempt: formattedResult.attempt - 1}).id;
        const failImagesInfo = _.clone(this._testsTree.getImagesInfo(failResultId)) as ImageInfoFull[];

        if (failImagesInfo.length) {
            formattedResult.imagesInfo?.forEach((imageInfo) => {
                const {stateName} = imageInfo as ImageInfoWithState;
                let index = _.findIndex(failImagesInfo, {stateName});
                index = index >= 0 ? index : _.findLastIndex(failImagesInfo);
                failImagesInfo[index] = imageInfo;
            });
        }

        return copyAndUpdate(formattedResult, {imagesInfo: failImagesInfo});
    }
}
