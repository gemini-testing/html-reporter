import 'tsconfig-paths/register';
import {setupBrowser} from '@testplane/testing-library';
import type {ConfigInput} from 'testplane';

export default {
    baseUrl: process.env['BROWSER_ENV'] === 'local' ? 'http://localhost:5173' : 'http://host.docker.internal:5173',
    gridUrl: process.env['BROWSER_ENV'] === 'local' ? 'local' : 'http://127.0.0.1:4444/',
    sessionsPerBrowser: 1,
    testsPerSession: 10,
    windowSize: {width: 1280, height: 1024},
    system: {
        workers: 1,
        testRunEnv: ['browser', {viteConfig: './vite.config.ts'}],
        mochaOpts: {timeout: 3600000}
    },
    sets: {
        component: {
            files: [
                'tests/**/*.testplane.tsx'
            ],
            browsers: [
                'chrome'
            ]
        }
    },
    browsers: {
        chrome: {
            headless: process.env['BROWSER_ENV'] !== 'local',
            desiredCapabilities: {
                browserName: 'chrome',
                'goog:chromeOptions': {
                    args: ['--no-sandbox', '--disable-dev-shm-usage'],
                    binary: process.env['BROWSER_ENV'] === 'local' ? undefined : '/usr/bin/chromium'
                }
            },
            waitTimeout: 3000
        }
    },
    plugins: {
        'html-reporter-tester': {
            enabled: true,
            path: 'html-report',
            defaultView: 'all'
        }
    },
    prepareBrowser(browser): void {
        setupBrowser(browser);
    }
} satisfies ConfigInput;
