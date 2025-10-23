if (process.env.TOOL === 'testplane') {
    describe(process.env.TOOL || 'Default', () => {
        describe('New UI', () => {
            describe('Suites page', () => {
                describe('Suite badges', () => {
                    it('show badges', async ({browser}) => {
                        const element = await browser.$('[data-list-item="failed describe/failed test with ansi markup/chrome"]');
                        await element.click();
                        const badgesElement = await browser.$('[data-qa="suite-badges"]');
                        await expect(badgesElement).toExist();
                        await badgesElement.assertView('badges');
                    });
                });
            });
        });
    });
}
