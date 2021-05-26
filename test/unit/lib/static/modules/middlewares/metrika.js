import YandexMetrika from 'lib/static/modules/yandex-metrika';
import actionNames from 'lib/static/modules/action-names';
import webVitals from 'lib/static/modules/web-vitals';

describe('lib/static/modules/middlewares/metrika', () => {
    const sandbox = sinon.sandbox.create();
    let next, metrikaMiddleware;

    const mkStore_ = (state = {}) => {
        return {getState: sandbox.stub().returns(state)};
    };

    const requireUncached_ = (module) => {
        delete require.cache[require.resolve(module)];
        return require(module).default;
    };

    const initReportWithMetrikaCounter = ({eventName = actionNames.INIT_GUI_REPORT, store = mkStore_()} = {}) => {
        const payload = {
            config: {
                yandexMetrika: {counterNumber: 100500}
            }
        };
        const action = {type: eventName, payload};

        metrikaMiddleware(YandexMetrika)(store)(next)(action);
    };

    beforeEach(() => {
        next = sandbox.stub();

        metrikaMiddleware = requireUncached_('lib/static/modules/middlewares/metrika');

        sandbox.stub(YandexMetrika, 'create').returns(Object.create(YandexMetrika.prototype));
        sandbox.stub(YandexMetrika.prototype, 'acceptScreenshot');
        sandbox.stub(YandexMetrika.prototype, 'acceptOpenedScreenshots');
        sandbox.stub(YandexMetrika.prototype, 'sendVisitParams');

        sandbox.stub(webVitals, 'measurePerformance');
    });

    afterEach(() => sandbox.restore());

    it('should call next middleware by default', () => {
        const store = mkStore_();
        const action = {type: 'FOO_BAR'};

        metrikaMiddleware(YandexMetrika)(store)(next)(action);

        assert.calledOnceWith(next, action);
    });

    [actionNames.INIT_GUI_REPORT, actionNames.INIT_STATIC_REPORT].forEach((eventName) => {
        describe(`"${eventName}" event`, () => {
            describe('"counterNumber" is not specified in y.metrika config', () => {
                let store, payload;

                beforeEach(() => {
                    store = mkStore_();
                    payload = {};
                });

                it('should call next middleware with passed action', () => {
                    const action = {type: eventName, payload};

                    metrikaMiddleware(YandexMetrika)(store)(next)(action);

                    assert.calledOnceWith(next, action);
                });

                it('should not create y.metrika instance', () => {
                    const action = {type: eventName, payload};

                    metrikaMiddleware(YandexMetrika)(store)(next)(action);

                    assert.notCalled(YandexMetrika.create);
                });

                it('should not measure site performance', () => {
                    const action = {type: eventName, payload};

                    metrikaMiddleware(YandexMetrika)(store)(next)(action);

                    assert.notCalled(webVitals.measurePerformance);
                });
            });

            describe('"counterNumber" is specified in y.metrika config', () => {
                let store, payload;

                beforeEach(() => {
                    store = mkStore_();
                    payload = {config: {
                        yandexMetrika: {counterNumber: 100500}
                    }};
                });

                it('should call next middleware with passed action', () => {
                    const action = {type: eventName, payload};

                    metrikaMiddleware(YandexMetrika)(store)(next)(action);

                    assert.calledOnceWith(next, action);
                });

                it('should call next middleware before get state', () => {
                    const action = {type: eventName, payload};

                    metrikaMiddleware(YandexMetrika)(store)(next)(action);

                    assert.callOrder(next, store.getState);
                });

                it('should create y.metrika instance with passed config', () => {
                    const action = {type: eventName, payload};

                    metrikaMiddleware(YandexMetrika)(store)(next)(action);

                    assert.calledOnceWith(YandexMetrika.create, {counterNumber: 100500});
                });

                describe('measure site performance', () => {
                    it('should send some performance info to y.metrika with rounded value', () => {
                        const action = {type: eventName, payload};
                        webVitals.measurePerformance.callsFake(cb => cb({name: 'XXX', value: 100.999}));

                        metrikaMiddleware(YandexMetrika)(store)(next)(action);

                        assert.calledWith(YandexMetrika.prototype.sendVisitParams.firstCall, {XXX: 101});
                    });

                    it('should send "CLS" performance info to y.metrika with multiplied by 1000 value', () => {
                        const action = {type: eventName, payload};
                        webVitals.measurePerformance.callsFake(cb => cb({name: 'CLS', value: 0.99999}));

                        metrikaMiddleware(YandexMetrika)(store)(next)(action);

                        assert.calledWith(YandexMetrika.prototype.sendVisitParams.firstCall, {CLS: 1000});
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

                        metrikaMiddleware(YandexMetrika)(store)(next)(action);

                        assert.calledOnceWith(YandexMetrika.prototype.sendVisitParams, sinon.match({[eventName]: 5000}));
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

                        metrikaMiddleware(YandexMetrika)(store)(next)(action);

                        assert.calledOnceWith(YandexMetrika.prototype.sendVisitParams, sinon.match({testsCount: 3}));
                    });

                    it('should send "view" params', () => {
                        const store = mkStore_({
                            view: {foo: 'bar', baz: 'qux'}
                        });
                        const action = {type: eventName, payload};

                        metrikaMiddleware(YandexMetrika)(store)(next)(action);

                        assert.calledOnceWith(
                            YandexMetrika.prototype.sendVisitParams,
                            sinon.match({initView: {foo: 'bar', baz: 'qux'}})
                        );
                    });
                });
            });
        });
    });

    describe(`"${actionNames.ACCEPT_SCREENSHOT}" event`, () => {
        describe('if metrika is not inited', () => {
            it('should not register goal', () => {
                const store = mkStore_();
                const action = {type: actionNames.ACCEPT_SCREENSHOT};

                metrikaMiddleware(YandexMetrika)(store)(next)(action);

                assert.notCalled(YandexMetrika.prototype.acceptScreenshot);
            });

            it('should not send counter id', () => {
                const store = mkStore_();
                const action = {type: actionNames.ACCEPT_SCREENSHOT};

                metrikaMiddleware(YandexMetrika)(store)(next)(action);

                assert.notCalled(YandexMetrika.prototype.sendVisitParams);
            });
        });

        it('should register goal', () => {
            const store = mkStore_();
            const action = {type: actionNames.ACCEPT_SCREENSHOT};
            initReportWithMetrikaCounter();

            metrikaMiddleware(YandexMetrika)(store)(next)(action);

            assert.calledWith(YandexMetrika.prototype.acceptScreenshot);
        });

        it('should send counter id', () => {
            const store = mkStore_();
            const action = {type: actionNames.ACCEPT_SCREENSHOT};
            initReportWithMetrikaCounter();

            metrikaMiddleware(YandexMetrika)(store)(next)(action);

            assert.calledWith(
                YandexMetrika.prototype.sendVisitParams,
                {counterId: actionNames.ACCEPT_SCREENSHOT}
            );
        });

        it('should call next middleware after register goal', () => {
            const store = mkStore_();
            const action = {type: actionNames.ACCEPT_SCREENSHOT};
            initReportWithMetrikaCounter();

            metrikaMiddleware(YandexMetrika)(store)(next)(action);

            assert.callOrder(YandexMetrika.prototype.acceptScreenshot, next);
        });

        it('should call next middleware with passed action', () => {
            const store = mkStore_();
            const action = {type: actionNames.ACCEPT_SCREENSHOT};
            initReportWithMetrikaCounter();

            metrikaMiddleware(YandexMetrika)(store)(next)(action);

            assert.calledWith(next, action);
        });
    });

    describe(`"${actionNames.ACCEPT_OPENED_SCREENSHOTS}" event`, () => {
        describe('if metrika is not inited', () => {
            it('should not register goal', () => {
                const store = mkStore_();
                const action = {type: actionNames.ACCEPT_OPENED_SCREENSHOTS, payload: [{}, {}]};

                metrikaMiddleware(YandexMetrika)(store)(next)(action);

                assert.notCalled(YandexMetrika.prototype.acceptOpenedScreenshots);
            });

            it('should not send counter id', () => {
                const store = mkStore_();
                const action = {type: actionNames.ACCEPT_OPENED_SCREENSHOTS};

                metrikaMiddleware(YandexMetrika)(store)(next)(action);

                assert.notCalled(YandexMetrika.prototype.sendVisitParams);
            });
        });

        it('should register goal', () => {
            const store = mkStore_();
            const action = {type: actionNames.ACCEPT_OPENED_SCREENSHOTS, payload: [{}, {}]};
            initReportWithMetrikaCounter();

            metrikaMiddleware(YandexMetrika)(store)(next)(action);

            assert.calledOnceWith(YandexMetrika.prototype.acceptOpenedScreenshots, {acceptedImagesCount: 2});
        });

        it('should send counter id', () => {
            const store = mkStore_();
            const action = {type: actionNames.ACCEPT_OPENED_SCREENSHOTS};
            initReportWithMetrikaCounter();

            metrikaMiddleware(YandexMetrika)(store)(next)(action);

            assert.calledWith(
                YandexMetrika.prototype.sendVisitParams,
                {counterId: actionNames.ACCEPT_OPENED_SCREENSHOTS}
            );
        });

        it('should call next middleware after register goal', () => {
            const store = mkStore_();
            const action = {type: actionNames.ACCEPT_OPENED_SCREENSHOTS, payload: [{}, {}]};
            initReportWithMetrikaCounter();

            metrikaMiddleware(YandexMetrika)(store)(next)(action);

            assert.callOrder(YandexMetrika.prototype.acceptOpenedScreenshots, next);
        });

        it('should call next middleware with passed action', () => {
            const store = mkStore_();
            const action = {type: actionNames.ACCEPT_OPENED_SCREENSHOTS, payload: [{}, {}]};
            initReportWithMetrikaCounter();

            metrikaMiddleware(YandexMetrika)(store)(next)(action);

            assert.calledWith(next, action);
        });
    });

    [
        actionNames.RUN_ALL_TESTS,
        actionNames.RUN_FAILED_TESTS,
        actionNames.RETRY_SUITE,
        actionNames.RETRY_TEST,
        actionNames.VIEW_SHOW_ALL,
        actionNames.VIEW_SHOW_FAILED,
        actionNames.VIEW_EXPAND_ALL,
        actionNames.VIEW_COLLAPSE_ALL,
        actionNames.VIEW_EXPAND_ERRORS,
        actionNames.VIEW_EXPAND_RETRIES,
        actionNames.VIEW_TOGGLE_SKIPPED,
        actionNames.VIEW_TOGGLE_ONLY_DIFF,
        actionNames.VIEW_TOGGLE_SCALE_IMAGES,
        actionNames.VIEW_TOGGLE_LAZY_LOAD_IMAGES,
        actionNames.VIEW_TOGGLE_GROUP_BY_ERROR,
        actionNames.VIEW_UPDATE_BASE_HOST,
        actionNames.BROWSERS_SELECTED,
        actionNames.VIEW_UPDATE_FILTER_BY_NAME,
        actionNames.VIEW_SET_STRICT_MATCH_FILTER,
        actionNames.RUN_CUSTOM_GUI_ACTION,
        actionNames.COPY_SUITE_NAME,
        actionNames.VIEW_IN_BROWSER,
        actionNames.COPY_TEST_LINK,
        actionNames.TOGGLE_SUITE_SECTION,
        actionNames.TOGGLE_BROWSER_SECTION
    ].forEach((eventName) => {
        describe(`"${eventName}" event`, () => {
            it('should not send counter id if metrika is not inited', () => {
                const store = mkStore_();
                const action = {type: eventName};

                metrikaMiddleware(YandexMetrika)(store)(next)(action);

                assert.notCalled(YandexMetrika.prototype.sendVisitParams);
                assert.calledWith(next, action);
            });

            it('should send counter id', () => {
                const store = mkStore_();
                const action = {type: eventName};
                initReportWithMetrikaCounter();

                metrikaMiddleware(YandexMetrika)(store)(next)(action);

                assert.calledWith(
                    YandexMetrika.prototype.sendVisitParams,
                    {counterId: eventName}
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
            it('should not send counter id if metrika is not inited', () => {
                const store = mkStore_();
                const action = {type: eventName, payload: {id: 'foo-bar'}};

                metrikaMiddleware(YandexMetrika)(store)(next)(action);

                assert.notCalled(YandexMetrika.prototype.sendVisitParams);
                assert.calledWith(next, action);
            });

            it('should send counter id from payload', () => {
                const store = mkStore_();
                const action = {type: eventName, payload: {id: 'foo-bar'}};
                initReportWithMetrikaCounter();

                metrikaMiddleware(YandexMetrika)(store)(next)(action);

                assert.calledWith(
                    YandexMetrika.prototype.sendVisitParams,
                    {counterId: 'foo-bar'}
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
            describe('should not send counter id if', () => {
                it('metrika is not inited', () => {
                    const store = mkStore_();
                    const action = {type: eventName, payload: {isUserClick: false}};

                    metrikaMiddleware(YandexMetrika)(store)(next)(action);

                    assert.notCalled(YandexMetrika.prototype.sendVisitParams);
                    assert.calledWith(next, action);
                });

                it('event not emitted by user', () => {
                    const store = mkStore_();
                    const action = {type: eventName, payload: {isUserClick: false}};
                    initReportWithMetrikaCounter();

                    metrikaMiddleware(YandexMetrika)(store)(next)(action);

                    assert.neverCalledWith(
                        YandexMetrika.prototype.sendVisitParams,
                        {counterId: eventName}
                    );
                    assert.calledWith(next, action);
                });
            });

            it('should send counter id if event emitted by user', () => {
                const store = mkStore_();
                const action = {type: eventName, payload: {isUserClick: true}};
                initReportWithMetrikaCounter();

                metrikaMiddleware(YandexMetrika)(store)(next)(action);

                assert.calledWith(
                    YandexMetrika.prototype.sendVisitParams,
                    {counterId: eventName}
                );
                assert.calledWith(next, action);
            });
        });
    });
});
