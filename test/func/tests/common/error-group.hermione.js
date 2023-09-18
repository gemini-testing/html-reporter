describe('Error grouping', function() {
    afterEach(async function() {
        await this.browser.execute(() => {
            window.localStorage.clear();
        });
    });

    it('should group errors', async function() {
        const groupByDropdown = await this.browser.$('div[data-test-id="group-by-dropdown"]');

        await groupByDropdown.click();

        await groupByDropdown.$('div=error').click();

        const groupedTestsContainer = await this.browser.$('.grouped-tests');

        const errorGroups = await this.browser.$$('.grouped-tests > div');
        assert.equal(errorGroups.length, 3);

        const longErrorMessageGroup = await groupedTestsContainer.$('span*=long_error_message').$('..');

        await expect(longErrorMessageGroup).toBeDisplayed();
        await expect(await longErrorMessageGroup.$('span*=tests: 1')).toBeDisplayed();
    });
});
