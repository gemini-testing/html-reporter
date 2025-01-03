import actionNames from 'lib/static/modules/action-names';
import proxyquire from 'proxyquire';

// eslint-disable-next-line
globalThis.performance = globalThis.performance; // node v14 stub

describe('lib/static/modules/middlewares/metrika', () => {
    const sandbox = sinon.sandbox.create();
    let next, getMetrikaMiddleware, measurePerformanceStub, analyticsStub;

    const mkStore_ = (state = {}) => {
        return {getState: sandbox.stub().returns(state)};
    };

    const initReportWithMetrikaCounter = ({eventName = actionNames.INIT_GUI_REPORT, store = mkStore_()} = {}) => {
        const payload = {
            config: {
                yandexMetrika: {counterNumber: 100500}
            }
        };
        const action = {type: eventName, payload};

        getMetrikaMiddleware(analyticsStub)(store)(next)(action);
    };

    beforeEach(() => {
        next = sandbox.stub();
        measurePerformanceStub = sandbox.stub();

        getMetrikaMiddleware = proxyquire.noPreserveCache().noCallThru()('lib/static/modules/middlewares/metrika', {
            '../web-vitals': {
                measurePerformance: measurePerformanceStub
            }
        }).getMetrikaMiddleware;

        analyticsStub = {
            setVisitParams: sinon.stub(),
            trackScreenshotsAccept: sinon.stub(),
            trackOpenedScreenshotsAccept: sinon.stub(),
            trackFeatureUsage: sinon.stub()
        };
    });

    afterEach(() => sandbox.restore());

    it('should call next middleware by default', () => {
        const store = mkStore_();
        const action = {type: 'FOO_BAR'};

        getMetrikaMiddleware(analyticsStub)(store)(next)(action);

        assert.calledOnceWith(next, action);
    });

    [actionNames.INIT_GUI_REPORT, actionNames.INIT_STATIC_REPORT].forEach((eventName) => {
        describe(`"${eventName}" event`, () => {
            let store, payload;

            beforeEach(() => {
                store = mkStore_();
                payload = {config: {
                    yandexMetrika: {counterNumber: 100500}
                }};
            });

            it('should call next middleware with passed action', () => {
                const action = {type: eventName, payload};

                getMetrikaMiddleware(analyticsStub)(store)(next)(action);

                assert.calledOnceWith(next, action);
            });

            it('should call next middleware before get state', () => {
                const action = {type: eventName, payload};

                getMetrikaMiddleware(analyticsStub)(store)(next)(action);

                assert.callOrder(next, store.getState);
            });

            describe('measure site performance', () => {
                it('should send some performance info to y.metrika with rounded value', () => {
                    const action = {type: eventName, payload};
                    measurePerformanceStub.callsFake(cb => cb({name: 'XXX', value: 100.999}));

                    getMetrikaMiddleware(analyticsStub)(store)(next)(action);

                    assert.calledWith(analyticsStub.setVisitParams.firstCall, {XXX: 101});
                });

                it('should send "CLS" performance info to y.metrika with multiplied by 1000 value', () => {
                    const action = {type: eventName, payload};
                    measurePerformanceStub.callsFake(cb => cb({name: 'CLS', value: 0.99999}));

                    getMetrikaMiddleware(analyticsStub)(store)(next)(action);

                    assert.calledWith(analyticsStub.setVisitParams.firstCall, {CLS: 1000});
                });
            });

            describe('send visit parameters to metrika', () => {
                let clock;

                beforeEach(() => {
                    clock = sinon.useFakeTimers();
                });

                afterEach(() => clock.restore());

                it(`should send "${eventName}" render time`, () => {
                    const store = mkStore_();
                    const action = {type: eventName, payload};
                    next = () => clock.tick(5000);

                    getMetrikaMiddleware(analyticsStub)(store)(next)(action);

                    assert.calledOnceWith(analyticsStub.setVisitParams, sinon.match({[eventName]: 5000}));
                });

                it('should send "testsCount"', () => {
                    const store = mkStore_({
                        tree: {
                            browsers: {
                                allIds: ['a', 'b', 'c']
                            }
                        }
                    });
                    const action = {type: eventName, payload};

                    getMetrikaMiddleware(analyticsStub)(store)(next)(action);

                    assert.calledOnceWith(analyticsStub.setVisitParams, sinon.match({testsCount: 3}));
                });

                it('should send "view" params', () => {
                    const store = mkStore_({
                        view: {foo: 'bar', baz: 'qux'}
                    });
                    const action = {type: eventName, payload};

                    getMetrikaMiddleware(analyticsStub)(store)(next)(action);

                    assert.calledOnceWith(
                        analyticsStub.setVisitParams,
                        sinon.match({initView: {foo: 'bar', baz: 'qux'}})
                    );
                });
            });
        });
    });

    [
        actionNames.RUN_ALL_TESTS,
        actionNames.RUN_FAILED_TESTS,
        actionNames.RETRY_SUITE,
        actionNames.RETRY_TEST,
        actionNames.CHANGE_VIEW_MODE,
        actionNames.VIEW_EXPAND_ALL,
        actionNames.VIEW_COLLAPSE_ALL,
        actionNames.VIEW_EXPAND_ERRORS,
        actionNames.VIEW_EXPAND_RETRIES,
        actionNames.VIEW_UPDATE_BASE_HOST,
        actionNames.BROWSERS_SELECTED,
        actionNames.VIEW_UPDATE_FILTER_BY_NAME,
        actionNames.VIEW_SET_STRICT_MATCH_FILTER,
        actionNames.RUN_CUSTOM_GUI_ACTION,
        actionNames.TOGGLE_SUITE_SECTION,
        actionNames.TOGGLE_BROWSER_SECTION,
        actionNames.GROUP_TESTS_BY_KEY
    ].forEach((eventName) => {
        describe(`"${eventName}" event`, () => {
            it('should track feature usage', () => {
                const store = mkStore_();
                const action = {type: eventName};
                initReportWithMetrikaCounter();

                getMetrikaMiddleware(analyticsStub)(store)(next)(action);

                assert.calledWith(
                    analyticsStub.trackFeatureUsage,
                    {featureName: eventName}
                );
                assert.calledWith(next, action);
            });
        });
    });

    [
        actionNames.OPEN_MODAL,
        actionNames.CLOSE_MODAL
    ].forEach((eventName) => {
        describe(`"${eventName}" event`, () => {
            it('should track feature usage', () => {
                const store = mkStore_();
                const action = {type: eventName, payload: {id: 'foo-bar'}};
                initReportWithMetrikaCounter();

                getMetrikaMiddleware(analyticsStub)(store)(next)(action);

                assert.calledWith(
                    analyticsStub.trackFeatureUsage,
                    {featureName: 'foo-bar'}
                );
                assert.calledWith(next, action);
            });
        });
    });

    [
        actionNames.TOGGLE_STATE_RESULT,
        actionNames.CHANGE_TEST_RETRY
    ].forEach((eventName) => {
        describe(`"${eventName}" event`, () => {
            it('should track feature usage', () => {
                const store = mkStore_();
                const action = {type: eventName};
                initReportWithMetrikaCounter();

                getMetrikaMiddleware(analyticsStub)(store)(next)(action);

                assert.calledWith(
                    analyticsStub.trackFeatureUsage,
                    {featureName: eventName}
                );
                assert.calledWith(next, action);
            });
        });
    });
});
