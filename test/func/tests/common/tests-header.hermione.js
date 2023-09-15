describe('Report header', function() {
    describe('Summary', function() {
        it('should show tests summary', async function() {
            const summaryHeader = await this.browser.$('header.header');
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
        it('should show creation date', async function() {
            const mainMenu = await this.browser.$('.main-menu');

            const creationLabel = await mainMenu.$('//div[contains(text(), \'Created at\')]');

            await expect(creationLabel).toBeDisplayed();
        });

        it('should show report version', async function() {
            const mainMenu = await this.browser.$('.main-menu');

            const versionLabel = await mainMenu.$('//div[contains(text(), \'Version\')]');
            await expect(versionLabel).toBeDisplayed();
        });
    });
});
