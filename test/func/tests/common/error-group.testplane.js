describe(process.env.TOOL || 'Default', () => {
    describe('Error grouping', function() {
        it('should group errors', async ({browser}) => {
            const groupByDropdown = await browser.$('[data-qa="group-by-dropdown"]');

            await groupByDropdown.click();

            await browser.$('div=error').click();

            const groupedTestsContainer = await browser.$('.grouped-tests');

            const longErrorMessageGroup = await groupedTestsContainer.$('span*=long_error_message').$('..');

            await expect(longErrorMessageGroup).toBeDisplayed();
            await expect(await longErrorMessageGroup.$('span*=tests: 1')).toBeDisplayed();
        });
    });
});
