import path from 'path';
import 'tsconfig-paths/register';
import { setupBrowser } from "@testplane/testing-library";
import type {ConfigInput} from 'testplane';

export default {
    // baseUrl: "http://host.docker.internal",
    gridUrl: "local",
    sessionsPerBrowser: 1,
    testsPerSession: 10,
    windowSize: {width: 1280, height: 1024},
    system: {
        workers: 1,
        testRunEnv: ["browser", {viteConfig: "./vite.config.ts"}],
        mochaOpts: { timeout: 3600000 }
    },
    sets: {
        component: {
            files: [
                "tests/**/*.testplane.tsx"
            ],
            browsers: [
                "chrome"
            ]
        }
    },
    browsers: {
        chrome: {
            desiredCapabilities: {
                browserName: "chrome",
                'goog:chromeOptions': {
                    args: ['--no-sandbox', '--disable-dev-shm-usage']
                }
            },
            headless: false,
            waitTimeout: 3000
        }
    },
    plugins: {
        "html-reporter-tester": {
            enabled: true,
            path: "html-report",
            defaultView: "all"
        }
    },
    prepareBrowser(browser) {
        setupBrowser(browser);
    },
} satisfies ConfigInput;
