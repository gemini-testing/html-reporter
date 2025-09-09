if (process.env.TOOL === 'testplane') {
    describe(process.env.TOOL || 'Default', () => {
        describe('New UI', () => {
            describe('Suites page', () => {
                describe('Name filter', () => {
                    it('should offer to collapse by default', async ({browser}) => {
                        const searchInput = await browser.$('[data-qa="name-filter"] input');
                        await searchInput.setValue('describe');
                        await browser.assertView();
                        expect(searchInput.getValue()).toEqual('describe');
                    });
                });
            });
        });
    });
}
