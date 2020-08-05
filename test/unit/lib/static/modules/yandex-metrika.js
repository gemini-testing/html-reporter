const YandexMetrika = require('lib/static/modules/yandex-metrika');

describe('YandexMetrika', () => {
    const sandbox = sinon.createSandbox();

    beforeEach(() => {
        global.window = {ym: sandbox.stub()};
    });

    afterEach(() => {
        global.window = undefined;
        sandbox.restore();
    });

    [
        {method: 'acceptScreenshot', target: 'ACCEPT_SCREENSHOT'},
        {method: 'acceptOpenedScreenshots', target: 'ACCEPT_OPENED_SCREENSHOTS'}
    ].forEach(({method, target}) => {
        describe(`"${method}" method`, () => {
            it(`should not register "${method}" goal if "counterNumber" is not a number`, () => {
                const yMetrika = YandexMetrika.create({counterNumber: null});

                yMetrika[method]();

                assert.notCalled(global.window.ym);
            });

            it('should register "${method}" goal', () => {
                const yMetrika = YandexMetrika.create({counterNumber: 100500});

                yMetrika[method]({count: 1});

                assert.calledOnceWith(global.window.ym, 100500, 'reachGoal', target, {count: 1});
            });
        });
    });
});
