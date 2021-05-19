import * as webVitals from 'web-vitals';
import {measurePerformance} from 'lib/static/modules/web-vitals';

describe('WebVitals', () => {
    const sandbox = sinon.createSandbox();

    beforeEach(() => {
        sandbox.stub(webVitals, 'getCLS');
        sandbox.stub(webVitals, 'getFID');
        sandbox.stub(webVitals, 'getFCP');
        sandbox.stub(webVitals, 'getLCP');
        sandbox.stub(webVitals, 'getTTFB');
    });

    afterEach(() => sandbox.restore());

    describe('measurePerformance', () => {
        ['getCLS', 'getFID', 'getFCP', 'getLCP', 'getTTFB'].forEach((methodName) => {
            it(`should not call "${methodName}" if callback is not passed`, () => {
                measurePerformance();

                assert.notCalled(webVitals[methodName]);
            });

            it(`should call "${methodName}" if callback is passed`, () => {
                const spy = sinon.spy();

                measurePerformance(spy);

                assert.calledOnceWith(webVitals[methodName], spy);
            });
        });
    });
});
