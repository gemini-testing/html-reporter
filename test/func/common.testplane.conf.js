const path = require('path');

const {GRID_URL, CHROME_BINARY_PATH} = require('./utils/constants');

module.exports.getCommonConfig = (projectDir) => ({
    gridUrl: GRID_URL,

    screenshotsDir: path.resolve(projectDir, 'screens'),

    browsers: {
        chrome: {
            assertViewOpts: {
                ignoreDiffPixelCount: 4
            },
            windowSize: '1280x1024',
            desiredCapabilities: {
                browserName: 'chrome',
                'goog:chromeOptions': {
                    args: ['headless', 'no-sandbox', 'hide-scrollbars', 'disable-dev-shm-usage'],
                    binary: CHROME_BINARY_PATH
                }
            },
            waitTimeout: 3000
        }
    }
});
