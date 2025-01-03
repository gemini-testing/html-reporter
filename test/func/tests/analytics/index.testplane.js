const childProcess = require('child_process');
const path = require('path');
const {PORTS} = require('../../utils/constants');

const projectDir = path.resolve(__dirname, '../../fixtures/analytics');

const generateFixtureReport = async (args, env) => {
    await new Promise(resolve => {
        const proc = childProcess.spawn('npx', ['testplane', ...args], {cwd: projectDir, env: {...process.env, ...env}});

        proc.on('exit', () => {
            resolve();
        });
    });
};

const launchStaticServer = () => {
    return new Promise((resolve) => {
        const proc = childProcess.spawn('node', [path.resolve(__dirname, '../static-server.js')], {
            stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
            env: {
                ...process.env,
                STATIC_DIR: path.resolve(__dirname, '../..'),
                PORT: PORTS.analytics.server
            }
        });

        proc.on('message', () => {
            resolve(proc);
        });
    });
};

describe('Analytics', () => {
    let server;

    afterEach(() => {
        server?.kill();
    });

    it('should include metrika script by default', async ({browser}) => {
        await generateFixtureReport(['-c', 'enabled.testplane.conf.js']);
        server = await launchStaticServer();

        await browser.url(browser.options.baseUrl.replace('index.html', 'new-ui.html'));
        const scriptElement = await browser.$('div[data-qa="metrika-script"] script');

        await expect(scriptElement).toBeExisting();
    });

    it('should track feature usage when opening info panel', async ({browser}) => {
        await generateFixtureReport(['-c', 'enabled.testplane.conf.js']);
        server = await launchStaticServer();

        await browser.url(browser.options.baseUrl.replace('index.html', 'new-ui.html'));
        await browser.execute(() => {
            window.ym = (...args) => {
                if (!window.ym.calls) {
                    window.ym.calls = [];
                }
                window.ym.calls.push(args);
            };
        });

        await browser.$('[data-qa="footer-item-info"]').click();

        const [metrikaCall] = await browser.execute(() => {
            return window.ym.calls;
        });

        expect(metrikaCall[1]).toEqual('reachGoal');
        expect(metrikaCall[2]).toEqual('FEATURE_USAGE');
        expect(metrikaCall[3]).toEqual({featureName: 'Open info panel'});
    });

    it('should not fail when opening info panel with analytics not available', async ({browser}) => {
        await generateFixtureReport(['-c', 'disabled.testplane.conf.js']);
        server = await launchStaticServer();

        await browser.url(browser.options.baseUrl.replace('index.html', 'new-ui.html'));
        await browser.$('[data-qa="footer-item-info"]').click();

        const infoPanelElement = await browser.$('div*=Data sources');

        await expect(infoPanelElement).toBeExisting();
    });

    it('should not include metrika script if analytics are disabled in config', async ({browser}) => {
        await generateFixtureReport(['-c', 'disabled.testplane.conf.js']);
        server = await launchStaticServer();

        await browser.url(browser.options.baseUrl.replace('index.html', 'new-ui.html'));
        const scriptElement = await browser.$('div[data-qa="metrika-script"] script');

        await expect(scriptElement).not.toBeExisting();
    });

    it('should not include metrika script if analytics are disabled via gemini-configparser env var', async ({browser}) => {
        await generateFixtureReport(['-c', 'enabled.testplane.conf.js'], {'html_reporter_yandex_metrika_enabled': false});
        server = await launchStaticServer();

        await browser.url(browser.options.baseUrl.replace('index.html', 'new-ui.html'));
        const scriptElement = await browser.$('div[data-qa="metrika-script"] script');

        await expect(scriptElement).not.toBeExisting();
    });

    it('should not include metrika script if analytics are disabled via NO_ANALYTICS env var', async ({browser}) => {
        await generateFixtureReport(['-c', 'enabled.testplane.conf.js'], {'NO_ANALYTICS': true});
        server = await launchStaticServer();

        await browser.url(browser.options.baseUrl.replace('index.html', 'new-ui.html'));
        const scriptElement = await browser.$('div[data-qa="metrika-script"] script');

        await expect(scriptElement).not.toBeExisting();
    });
});
