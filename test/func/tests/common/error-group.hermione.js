describe('Error grouping', function() {
    it('should group errors', async ({browser}) => {
        const groupByDropdown = await browser.$('div[data-test-id="group-by-dropdown"]');

        await groupByDropdown.click();

        await groupByDropdown.$('div=error').click();

        const groupedTestsContainer = await browser.$('.grouped-tests');

        const errorGroups = await browser.$$('.grouped-tests > div');
        assert(errorGroups.length >= 2 && errorGroups.length <= 3);

        const longErrorMessageGroup = await groupedTestsContainer.$('span*=long_error_message').$('..');

        await expect(longErrorMessageGroup).toBeDisplayed();
        await expect(await longErrorMessageGroup.$('span*=tests: 1')).toBeDisplayed();
    });
});
