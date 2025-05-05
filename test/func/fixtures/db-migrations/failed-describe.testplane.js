describe('failed describe', function() {
    it('successfully passed test', async ({browser}) => {
        await browser.url(browser.options.baseUrl);

        assert.isTrue(true);
    });

    it('test without screenshot', async ({browser}) => {
        await browser.url(browser.options.baseUrl);

        await browser.assertView('header', 'header');
    });

    it('test with image comparison diff', async ({browser}) => {
        await browser.url(browser.options.baseUrl);

        await browser.assertView('header', 'header');
    });

    it('test with long error message', async () => {
        throw new Error(`long_error_message ${'0123456789'.repeat(20)}\n message content`);
    });

    it('test with successful assertView and error', async ({browser}) => {
        await browser.url(browser.options.baseUrl);

        await browser.assertView('header', 'header', {ignoreDiffPixelCount: '100%'});

        throw new Error('Some error');
    });

    it('failed test with ansi markup', async () => {
        await expect({a: {b: 'c'}}).toMatchObject({c: {b: 'a'}});
    });

    it.skip('test skipped', async ({browser}) => {
        await browser.url(browser.options.baseUrl);
    });
});
