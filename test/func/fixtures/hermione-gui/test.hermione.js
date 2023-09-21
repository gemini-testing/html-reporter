describe('tests to run', () => {
    it('test with diff', async ({browser}) => {
        await browser.url(browser.options.baseUrl);

        await browser.assertView('paragraph', '#paragraph-1');
    });

    it('test with no ref', async ({browser}) => {
        await browser.url(browser.options.baseUrl);

        await browser.assertView('paragraph', '#paragraph-3');
    });
});

describe('tests not to run', () => {
    it('successful test', async ({browser}) => {
        await browser.url(browser.options.baseUrl);

        assert.isTrue(true);
    });
});
