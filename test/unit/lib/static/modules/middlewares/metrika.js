import metrikaMiddleware from 'lib/static/modules/middlewares/metrika';
import YandexMetrika from 'lib/static/modules/yandex-metrika';
import actionNames from 'lib/static/modules/action-names';

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
            it('should call next middleware with passed action', () => {
                const store = mkStore_();
                const action = {type: eventName};

                metrikaMiddleware(YandexMetrika)(store)(next)(action);

                assert.calledOnceWith(next, action);
            });

            it('should call next middleware before get state', () => {
                const store = mkStore_();
                const action = {type: eventName};

                metrikaMiddleware(YandexMetrika)(store)(next)(action);

                assert.callOrder(next, store.getState);
            });

            it('should create yandex metrika instance after get updated state', () => {
                const store = mkStore_();
                const action = {type: eventName};

                metrikaMiddleware(YandexMetrika)(store)(next)(action);

                assert.callOrder(store.getState, YandexMetrika.create);
            });

            it('should create yandex metrika instance with passed config', () => {
                const store = mkStore_({
                    config: {
                        yandexMetrika: {
                            foo: 'bar'
                        }
                    }
                });
                const action = {type: eventName};

                metrikaMiddleware(YandexMetrika)(store)(next)(action);

                assert.calledOnceWith(YandexMetrika.create, {foo: 'bar'});
            });

            describe('send visit parameters to metrika', () => {
                let clock;

                beforeEach(() => {
                    clock = sinon.useFakeTimers();
                });

                afterEach(() => clock.restore());

                it('should send "tti" time', () => {
                    const store = mkStore_();
                    const action = {type: eventName};
                    next = () => clock.tick(5000);

                    metrikaMiddleware(YandexMetrika)(store)(next)(action);

                    assert.calledOnceWith(YandexMetrika.prototype.sendVisitParams, sinon.match({tti: 5000}));
                });

                it('should send "testsCount"', () => {
                    const store = mkStore_({
                        tree: {
                            browsers: {
                                allIds: ['a', 'b', 'c']
                            }
                        }
                    });
                    const action = {type: eventName};

                    metrikaMiddleware(YandexMetrika)(store)(next)(action);

                    assert.calledOnceWith(YandexMetrika.prototype.sendVisitParams, sinon.match({testsCount: 3}));
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

            assert.calledOnceWith(YandexMetrika.prototype.acceptOpenedScreenshots, {count: 2});
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
