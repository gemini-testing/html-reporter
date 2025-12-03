describe('failed describe', function() {
    it('successfully passed test', {tag: 'ok-test'}, async ({browser}) => {
        await browser.url(browser.options.baseUrl);

        assert.isTrue(true);
    });

    it('test without screenshot', {tag: ['no-image']}, async ({browser}) => {
        await browser.url(browser.options.baseUrl);

        await browser.assertView('header', 'header');
    });

    it('test with image comparison diff', {tag: 'error-test'}, async ({browser}) => {
        await browser.url(browser.options.baseUrl);

        await browser.assertView('header', 'header');
    });

    it('test with long error message', {tag: 'error-test'}, async () => {
        throw new Error(`long_error_message ${'0123456789'.repeat(20)}\n message content`);
    });

    it('test with successful assertView and error', {tag: 'error-test'}, async ({browser}) => {
        await browser.url(browser.options.baseUrl);

        await browser.assertView('header', 'header', {ignoreDiffPixelCount: '100%'});

        throw new Error('Some error');
    });

    it('failed test with ansi markup', {tag: 'error-test'}, async () => {
        await expect({a: {b: 'c'}}).toMatchObject({c: {b: 'a'}});
    });

    it.skip('test skipped', {tag: 'skip-test'}, async ({browser}) => {
        await browser.url(browser.options.baseUrl);
    });
});
