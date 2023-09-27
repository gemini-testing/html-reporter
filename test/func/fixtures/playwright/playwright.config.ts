import path from 'path';
import {defineConfig, devices} from '@playwright/test';

const serverHost = process.env.SERVER_HOST ?? 'localhost';
const serverPort = process.env.SERVER_PORT ?? 8085;

export default defineConfig({
    testDir: './tests',
    timeout: 30 * 1000,
    expect: {
        timeout: 5000
    },
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: 2,
    workers: 1,
    reporter: [
        ['html-reporter-tester/playwright', {
            path: path.resolve(__dirname, 'report'),
            saveFormat: 'sqlite',
            defaultView: 'failed',
            saveErrorDetails: true
        }]
    ],
    use: {
        actionTimeout: 0,
        baseURL: `http://${serverHost}:${serverPort}/fixtures/hermione/index.html`,
        screenshot: {
            mode: 'on',
            fullPage: true
        }
    },

    projects: [
        {
            name: 'chromium',
            use: {...devices['Desktop Chrome']}
        }
    ],

    webServer: {
        command: `npx http-server ${path.resolve(__dirname, '../..')} -c-1 -p ${serverPort}`,
        port: Number(serverPort),
        stdout: 'pipe'
    },

    snapshotPathTemplate: '{testDir}/screens/{testName}/{projectName}/{arg}{ext}'
});
