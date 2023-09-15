describe('Error grouping', function() {
    afterEach(async function() {
        await this.browser.execute(() => {
            window.localStorage.clear();
        });
    });

    it('should group errors', async function() {
        const groupBySelect = await this.browser.$('div*=Group by').$('..').$('div:nth-child(2)');

        await groupBySelect.click();

        await groupBySelect.$('div=error').click();

        const groupedTestsContainer = await this.browser.$('.grouped-tests');

        const errorGroups = await this.browser.$$('.grouped-tests > div');
        assert.equal(errorGroups.length, 1);

        const longErrorMessageGroup = await groupedTestsContainer.$('span*=long_error_message').$('..');

        await expect(longErrorMessageGroup).toBeDisplayed();
        await expect(await longErrorMessageGroup.$('span*=tests: 1')).toBeDisplayed();
    });
});
