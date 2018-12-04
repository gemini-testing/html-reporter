import { ISuite } from 'typings/suite-adapter';

const clientEvents = require('../../constants/client-events');
const {RUNNING} = require('../../../constants/test-statuses');
const {saveTestImages, saveTestCurrentImage} = require('../../../reporter-helpers');
const {findTestResult} = require('../utils');
interface  IGeminiOnType {
    suite: any;
    browserId: ISuite;
}
import { TestAdapterType} from 'typings/test-adapter';

module.exports = (gemini: any, reportBuilder: TestAdapterType, client: any, reportPath: string) => {

    gemini.on(gemini.events.BEGIN_SUITE, ({suite, browserId}: IGeminiOnType) => {
        const {name, path: suitePath} = suite;
        if (suite.shouldSkip(browserId)) {
            return;
        }

        client.emit(clientEvents.BEGIN_SUITE, {
            name,
            suitePath,
            status: RUNNING
        });
    });

    gemini.on(gemini.events.BEGIN_STATE, (data: any) => {
        const {name, suite: {path: suitePath}} = data.state;
        client.emit(clientEvents.BEGIN_STATE, {
            suitePath: suitePath.concat(name),
            browserId: data.browserId,
            status: RUNNING
        });
    });

    gemini.on(gemini.events.TEST_RESULT, (data: any) => {
        const formattedResult = data.equal
            ? reportBuilder.addSuccess(data)
            : reportBuilder.addFail(data);

        const testResult = findTestResult(reportBuilder.getSuites(), formattedResult.prepareTestResult());

        saveTestImages(formattedResult, reportPath)
            .then(() => client.emit(clientEvents.TEST_RESULT, testResult));
    });

    gemini.on(gemini.events.ERROR, (error: string) => {
        const formattedResult = reportBuilder.addError(error);
        const testResult = findTestResult(reportBuilder.getSuites(), formattedResult.prepareTestResult());

        saveTestCurrentImage(formattedResult, reportPath)
            .then(() => client.emit(gemini.events.ERROR, testResult));
    });

    gemini.on(gemini.events.RETRY, (data: any) => {
        const formattedResult = reportBuilder.addRetry(data);

        const actionFn = formattedResult.hasDiff()
            ? saveTestImages
            : saveTestCurrentImage;

        actionFn(formattedResult, reportPath);
    });

    gemini.on(gemini.events.END_RUNNER, () => {
        return reportBuilder.save().then(() => client.emit(clientEvents.END));
    });
};
