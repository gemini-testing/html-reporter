describe('success describe', function() {
    it('succesfully passed test', async ({browser}) => {
        await browser.url(browser.options.baseUrl);

        assert.isTrue(true);
    });

    it('test with screenshot', async ({browser}) => {
        await browser.url(browser.options.baseUrl);

        await browser.assertView('header', 'header');
    });
});
