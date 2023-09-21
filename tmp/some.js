const webdriverio = require('webdriverio');

(async () => {
    const client = await webdriverio.remote({
        hostname: 'localhost',
        port: 4444,
        capabilities: {
            browserName: 'chrome',
            'goog:chromeOptions': {
                args: ['headless', 'no-sandbox'],
                binary: '/home/circleci/browsers/chrome-linux/chrome',
            }
        }
    });

    await client.url('http://host.docker.internal:8080/');

    const elem = await client.$('//div[contains(text(),\'test without screenshot\')]/..').$('button[data-test-id="retry-switcher"]');
    console.log(await elem.getAttribute('class'));
})();
