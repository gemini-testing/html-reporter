import YandexMetrika from 'lib/static/modules/yandex-metrika';

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

    ['acceptScreenshot', 'acceptOpenedScreenshots', 'sendVisitParams'].forEach((methodName) => {
        describe(`"${methodName}" method`, () => {
            describe('should not send anything to yandex metrika if', () => {
                it('"counterNumber" is not a number', () => {
                    const yMetrika = YandexMetrika.create({counterNumber: null});

                    yMetrika[methodName]();

                    assert.notCalled(global.window.ym);
                });
            });
        });
    });

    [
        {methodName: 'acceptScreenshot', target: 'ACCEPT_SCREENSHOT'},
        {methodName: 'acceptOpenedScreenshots', target: 'ACCEPT_OPENED_SCREENSHOTS'}
    ].forEach(({methodName, target}) => {
        describe(`"${methodName}" method`, () => {
            it('should register "${method}" goal', () => {
                const yMetrika = YandexMetrika.create({counterNumber: 100500});

                yMetrika[methodName]({acceptedImagesCount: 1});

                assert.calledOnceWith(global.window.ym, 100500, 'reachGoal', target, {acceptedImagesCount: 1});
            });
        });
    });

    describe('"sendVisitParams" method', () => {
        it(`should send all passed parameters`, () => {
            const yMetrika = YandexMetrika.create({counterNumber: 100500});

            yMetrika.sendVisitParams({foo: 10, bar: 20});

            assert.calledOnceWith(global.window.ym, 100500, 'params', {foo: 10, bar: 20});
        });
    });
});
