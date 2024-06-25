const path = require('path');

const {GRID_URL} = require('./utils/constants');

module.exports.getCommonConfig = (projectDir) => ({
    gridUrl: GRID_URL,

    screenshotsDir: path.resolve(projectDir, 'screens'),

    browsers: {
        chrome: {
            windowSize: '1280x1024',
            desiredCapabilities: {
                browserName: 'chrome',
                'goog:chromeOptions': {
                    args: ['headless', 'no-sandbox', 'hide-scrollbars', 'disable-dev-shm-usage'],
                }
            },
            waitTimeout: 3000
        }
    },
});
