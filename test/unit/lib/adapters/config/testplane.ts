import type {Config, Test} from 'testplane';
import sinon from 'sinon';
import {TestplaneConfigAdapter} from '../../../../../lib/adapters/config/testplane';
import {TestplaneTestAdapter} from '../../../../../lib/adapters/test/testplane';
import {stubConfig, mkState} from '../../../utils';

describe('lib/adapters/config/testplane', () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => sandbox.restore());

    describe('tolerance', () => {
        it('should return tolerance from original config', () => {
            const config = stubConfig({tolerance: 100500}) as Config;
            const configAdapter = TestplaneConfigAdapter.create(config);

            assert.equal(configAdapter.tolerance, 100500);
        });
    });

    describe('antialiasingTolerance', () => {
        it('should return antialiasingTolerance from original config', () => {
            const config = stubConfig({antialiasingTolerance: 500100}) as Config;
            const configAdapter = TestplaneConfigAdapter.create(config);

            assert.equal(configAdapter.antialiasingTolerance, 500100);
        });
    });

    describe('getScreenshotPath', () => {
        it('should return screenshot path from original browser config', () => {
            const test = mkState({browserId: 'yabro'});
            const testAdapter = TestplaneTestAdapter.create(test as unknown as Test);
            const stateName = 'plain';

            const getScreenshotPath = sandbox.stub().withArgs(test, stateName).returns('/ref/path');
            const config = stubConfig({browsers: {yabro: {getScreenshotPath}}}) as Config;
            const configAdapter = TestplaneConfigAdapter.create(config);

            assert.equal(configAdapter.getScreenshotPath(testAdapter, stateName), '/ref/path');
        });
    });

    describe('getBrowserIds', () => {
        it('should return browser ids from original config', () => {
            const config = stubConfig({browsers: {yabro1: {}, yabro2: {}}}) as Config;
            const configAdapter = TestplaneConfigAdapter.create(config);

            assert.deepEqual(configAdapter.getBrowserIds(), ['yabro1', 'yabro2']);
        });
    });

    describe('forBrowser', () => {
        it('should return browser config from original config', () => {
            const browserConfig = {foo: 'bar'} as unknown as ReturnType<Config['forBrowser']>;
            const config = stubConfig({browsers: {yabro: browserConfig}}) as Config;
            const configAdapter = TestplaneConfigAdapter.create(config);

            assert.deepEqual(configAdapter.forBrowser('yabro'), browserConfig);
        });
    });
});
