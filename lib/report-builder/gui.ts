import * as _ from 'lodash';
import {StaticReportBuilder} from './static';
import {GuiTestsTreeBuilder, TestBranch, TestEqualDiffsData, TestRefUpdateData} from '../tests-tree-builder/gui';
import {
    IDLE, RUNNING, SKIPPED, FAIL, SUCCESS, UPDATED, TestStatus, DB_COLUMNS, ToolName, ERROR
} from '../constants';
import {ConfigForStaticFile, getConfigForStaticFile} from '../server-utils';
import {ReporterTestResult} from '../test-adapter';
import {PreparedTestResult} from '../sqlite-adapter';
import {Tree, TreeImage, TreeResult} from '../tests-tree-builder/base';
import {ImageInfoWithState, ReporterConfig} from '../types';
import {hasDiff, hasNoRefImageErrors, hasResultFails, isSkippedStatus, isUpdatedStatus} from '../common-utils';
import {HtmlReporterValues} from '../plugin-api';
import {SkipItem} from '../tests-tree-builder/static';

interface UndoAcceptImageResult {
    updatedImage: TreeImage | undefined;
    removedResult: string | undefined;
    previousExpectedPath: string | null;
    shouldRemoveReference: boolean;
    shouldRevertReference: boolean;
}

interface GuiReportBuilderResult {
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

    getCurrAttempt(formattedResult: ReporterTestResult): number {
        const lastResult = this._testsTree.getLastResult(formattedResult);
        this._checkResult(lastResult, formattedResult);

        const {status, attempt} = lastResult;

        return [IDLE, RUNNING, SKIPPED].includes(status) ? attempt : attempt + 1;
    }

    getUpdatedAttempt(formattedResult: ReporterTestResult): number {
        const lastResult = this._testsTree.getLastResult(formattedResult);
        this._checkResult(lastResult, formattedResult);

        const {attempt} = lastResult;

        const imagesInfo = this._testsTree.getImagesInfo(formattedResult.id);
        const isUpdated = imagesInfo.some((image) => image.status === UPDATED);

        return isUpdated ? attempt : attempt + 1;
    }

    async undoAcceptImage(formattedResult: ReporterTestResult, stateName: string): Promise<UndoAcceptImageResult | null> {
        const resultId = formattedResult.id;
        const suitePath = formattedResult.testPath;
        const browserName = formattedResult.browserId;
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

        let updatedImage, removedResult;

        if (shouldRemoveResult) {
            this._testsTree.removeTestResult(resultId);
            formattedResult.attempt = formattedResult.attempt - 1;

            removedResult = resultId;
        } else if (previousImage) {
            updatedImage = this._testsTree.updateImageInfo(imageId, previousImage);
        }

        this._deleteTestResultFromDb({where: [
            `${DB_COLUMNS.SUITE_PATH} = ?`,
            `${DB_COLUMNS.NAME} = ?`,
            `${DB_COLUMNS.STATUS} = ?`,
            `${DB_COLUMNS.TIMESTAMP} = ?`,
            `json_extract(${DB_COLUMNS.IMAGES_INFO}, '$[0].stateName') = ?`
        ].join(' AND ')}, JSON.stringify(suitePath), browserName, status, timestamp.toString(), stateName);

        return {updatedImage, removedResult, previousExpectedPath, shouldRemoveReference, shouldRevertReference};
    }

    protected override _addTestResult(formattedResult: ReporterTestResult, props: {status: TestStatus} & Partial<PreparedTestResult>, opts: {failResultId?: string} = {}): ReporterTestResult {
        super._addTestResult(formattedResult, props);

        const testResult = this._createTestResult(formattedResult, {
            ...props,
            timestamp: formattedResult.timestamp ?? 0,
            attempt: formattedResult.attempt
        });

        this._extendTestWithImagePaths(testResult, formattedResult, opts);

        if (![IDLE, RUNNING].includes(testResult.status)) {
            this._updateTestResultStatus(testResult, formattedResult);
        }

        this._testsTree.addTestResult(testResult, formattedResult);

        return formattedResult;
    }

    protected _checkResult(result: TreeResult | undefined, formattedResult: ReporterTestResult): asserts result is TreeResult {
        if (!result) {
            const filteredTestTreeResults = _.pickBy(
                this._testsTree.tree.results.byId,
                (_result, resultId) => resultId.startsWith(formattedResult.fullName));

            throw new Error('Failed to get last result for test:\n' +
                `fullName = ${formattedResult.fullName}; browserId = ${formattedResult.browserId}\n` +
                `Related testsTree results: ${JSON.stringify(filteredTestTreeResults)}\n`);
        }
    }

    private _updateTestResultStatus(testResult: PreparedTestResult, formattedResult: ReporterTestResult): void {
        if (!hasResultFails(testResult) && !isSkippedStatus(testResult.status)) {
            testResult.status = SUCCESS;
            return;
        }

        const imageErrors = testResult.imagesInfo.map(imagesInfo => (imagesInfo as {error: {name?: string}}).error ?? {});
        if (hasDiff(imageErrors) || hasNoRefImageErrors({assertViewResults: imageErrors})) {
            testResult.status = FAIL;
            return;
        }

        if (!_.isEmpty(formattedResult.error)) {
            testResult.status = ERROR;
            return;
        }
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
