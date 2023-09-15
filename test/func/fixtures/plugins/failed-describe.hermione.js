describe('failed describe', function() {
    it('successfully passed test', async function() {
        await this.browser.url(this.browser.options.baseUrl);

        assert.isTrue(true);
    });

    it('test without screenshot', async function() {
        await this.browser.url(this.browser.options.baseUrl);

        await this.browser.assertView('header', 'header');
    });

    it('test with long error message', async function() {
        throw new Error(`long_error_message ${'0123456789'.repeat(20)}\n message content`);
    });
});
