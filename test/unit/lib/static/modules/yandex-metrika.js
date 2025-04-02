const {YandexMetrika} = require('lib/static/modules/yandex-metrika');

describe('YandexMetrika', () => {
    const sandbox = sinon.createSandbox();
    let originalWindow;

    beforeEach(() => {
        originalWindow = global.window;
        global.window = {ym: sandbox.stub()};
    });

    afterEach(() => {
        global.window = originalWindow;
        sandbox.restore();
    });

    ['setVisitParams', 'trackScreenshotsAccept', 'trackOpenedScreenshotsAccept', 'trackFeatureUsage'].forEach((methodName) => {
        describe(`"${methodName}" method`, () => {
            it('should not send anything to yandex metrika if disabled', () => {
                const yMetrika = new YandexMetrika(false, 0);

                yMetrika[methodName]();

                assert.notCalled(global.window.ym);
            });
        });
    });

    [
        {methodName: 'trackScreenshotsAccept', target: 'ACCEPT_SCREENSHOT'},
        {methodName: 'trackOpenedScreenshotsAccept', target: 'ACCEPT_OPENED_SCREENSHOTS'}
    ].forEach(({methodName, target}) => {
        describe(`"${methodName}" method`, () => {
            it('should register "${method}" goal', () => {
                const yMetrika = new YandexMetrika(true, 100500);

                yMetrika[methodName]({acceptedImagesCount: 1});

                assert.calledOnceWith(global.window.ym, 100500, 'reachGoal', target, {acceptedImagesCount: 1});
            });
        });
    });

    describe('"setVisitParams" method', () => {
        it(`should send all passed parameters`, () => {
            const yMetrika = new YandexMetrika(true, 100500);

            yMetrika.setVisitParams({foo: 10, bar: 20});

            assert.calledOnceWith(global.window.ym, 100500, 'params', {foo: 10, bar: 20});
        });
    });
});
