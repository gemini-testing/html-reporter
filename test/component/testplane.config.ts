import path from 'path';
import 'tsconfig-paths/register';

export default {
    // Don't set baseUrl here - let Testplane's ViteServer set it automatically
    // baseUrl: "http://host.docker.internal",
    gridUrl: "local",
    sessionsPerBrowser: 1,
    testsPerSession: 10,
    windowSize: "1280x1024",
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
        "html-reporter/testplane": {
            enabled: true,
            path: "html-report",
            defaultView: "all"
        }
    }
};