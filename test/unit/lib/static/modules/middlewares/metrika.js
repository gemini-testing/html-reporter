import metrikaMiddleware from 'lib/static/modules/middlewares/metrika';
import YandexMetrika from 'lib/static/modules/yandex-metrika';
import actionNames from 'lib/static/modules/action-names';
import webVitals from 'lib/static/modules/web-vitals';

describe('lib/static/modules/middlewares/metrika', () => {
    const sandbox = sinon.sandbox.create();
    let next;

    const mkStore_ = (state = {}) => {
        return {
            getState: sandbox.stub().returns(state)
        };
    };

    beforeEach(() => {
        next = sandbox.stub();

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
        it('should register goal', () => {
            const store = mkStore_();
            const action = {type: actionNames.ACCEPT_SCREENSHOT};

            metrikaMiddleware(YandexMetrika)(store)(next)(action);

            assert.calledOnceWith(YandexMetrika.prototype.acceptScreenshot);
        });

        it('should call next middleware after register goal', () => {
            const store = mkStore_();
            const action = {type: actionNames.ACCEPT_SCREENSHOT};

            metrikaMiddleware(YandexMetrika)(store)(next)(action);

            assert.callOrder(YandexMetrika.prototype.acceptScreenshot, next);
        });

        it('should call next middleware with passed action', () => {
            const store = mkStore_();
            const action = {type: actionNames.ACCEPT_SCREENSHOT};

            metrikaMiddleware(YandexMetrika)(store)(next)(action);

            assert.calledOnceWith(next, action);
        });
    });

    describe(`"${actionNames.ACCEPT_OPENED_SCREENSHOTS}" event`, () => {
        it('should register goal', () => {
            const store = mkStore_();
            const action = {type: actionNames.ACCEPT_OPENED_SCREENSHOTS, payload: [{}, {}]};

            metrikaMiddleware(YandexMetrika)(store)(next)(action);

            assert.calledOnceWith(YandexMetrika.prototype.acceptOpenedScreenshots, {acceptedImagesCount: 2});
        });

        it('should call next middleware after register goal', () => {
            const store = mkStore_();
            const action = {type: actionNames.ACCEPT_OPENED_SCREENSHOTS, payload: [{}, {}]};

            metrikaMiddleware(YandexMetrika)(store)(next)(action);

            assert.callOrder(YandexMetrika.prototype.acceptOpenedScreenshots, next);
        });

        it('should call next middleware with passed action', () => {
            const store = mkStore_();
            const action = {type: actionNames.ACCEPT_OPENED_SCREENSHOTS, payload: [{}, {}]};

            metrikaMiddleware(YandexMetrika)(store)(next)(action);

            assert.calledOnceWith(next, action);
        });
    });
});
