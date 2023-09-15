describe('success describe', function() {
    it('succesfully passed test', async function() {
        await this.browser.url(this.browser.options.baseUrl);

        assert.isTrue(true);
    });

    it('test with screenshot', async function() {
        await this.browser.url(this.browser.options.baseUrl);

        await this.browser.assertView('header', 'header');
    });
});
