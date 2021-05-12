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
    });

    afterEach(() => sandbox.restore());

    it('should call next middleware by default', () => {
        const store = mkStore_();
        const action = {type: 'FOO_BAR'};

        metrikaMiddleware(YandexMetrika)(store)(next)(action);

        assert.calledOnceWith(next, action);
    });

    describe(`"${actionNames.INIT_GUI_REPORT}" event`, () => {
        it('should call next middleware with passed action', () => {
            const store = mkStore_();
            const action = {type: actionNames.INIT_GUI_REPORT};

            metrikaMiddleware(YandexMetrika)(store)(next)(action);

            assert.calledOnceWith(next, action);
        });

        it('should call next middleware before get state', () => {
            const store = mkStore_();
            const action = {type: actionNames.INIT_GUI_REPORT};

            metrikaMiddleware(YandexMetrika)(store)(next)(action);

            assert.callOrder(next, store.getState);
        });

        it('should create yandex metrika instance after get updated state', () => {
            const store = mkStore_();
            const action = {type: actionNames.INIT_GUI_REPORT};

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
            const action = {type: actionNames.INIT_GUI_REPORT};

            metrikaMiddleware(YandexMetrika)(store)(next)(action);

            assert.calledOnceWith(YandexMetrika.create, {foo: 'bar'});
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
