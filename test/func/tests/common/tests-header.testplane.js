describe('Report header', function() {
    describe('Summary', function() {
        it('should show tests summary', async ({browser}) => {
            const summaryHeader = await browser.$('header.header');
            await summaryHeader.waitForDisplayed();

            await expect(await summaryHeader.$('dt*=Total Tests')).toBeDisplayed();
            await expect(await summaryHeader.$('dt*=Passed')).toBeDisplayed();
            await expect(await summaryHeader.$('dt*=Failed')).toBeDisplayed();
            await expect(await summaryHeader.$('dt*=Retries')).toBeDisplayed();
            await expect(await summaryHeader.$('dt*=Skipped')).toBeDisplayed();
            await expect(await summaryHeader.$('button*=Databases loaded')).toBeDisplayed();
        });
    });

    describe('Main menu', function() {
        it('should show creation date', async ({browser}) => {
            const creationLabel = await browser.$('div[data-qa="created-at-label"]');

            await expect(creationLabel).toBeDisplayed();
        });

        it('should show report version', async ({browser}) => {
            const versionLabel = await browser.$('div[data-qa="version-label"]');

            await expect(versionLabel).toBeDisplayed();
        });
    });
});
