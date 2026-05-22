if (process.env.TOOL === 'testplane') {
    describe(process.env.TOOL || 'Default', () => {
        describe('New UI', () => {
            describe('View in browser button behavior', () => {
                it('should exist and have correct link on startup', async ({browser}) => {
                    const treeItem = await browser.$('[data-list-item*="test with image comparison diff/chrom"]');
                    await treeItem.moveTo();

                    const eyeElement = await treeItem.$('a[data-qa="view-in-browser-tree"]');
                    const link = await eyeElement.getAttribute('href');

                    await expect(eyeElement).toBeClickable();
                    expect(link).toBe('https://example.com:123/fixtures/testplane/index.html');
                });

                it('should change in accordance to the baseHost in header', async ({browser}) => {
                    const settings = await browser.$('[data-qa="footer-item-settings"]');
                    await settings.click();

                    const baseHostInput = await browser.$('[data-qa="base-host"] input');
                    await baseHostInput.setValue('http://some-host.dev:33');

                    await settings.click();

                    const treeItem = await browser.$('[data-list-item*="test with image comparison diff/chrom"]');
                    await treeItem.moveTo();

                    const eyeElement = await treeItem.$('a[data-qa="view-in-browser-tree"]');
                    const link = await eyeElement.getAttribute('href');

                    expect(link).toBe('http://some-host.dev:33/fixtures/testplane/index.html');
                });

                it('should exist in suite page', async ({browser}) => {
                    const treeItem = await browser.$('[data-list-item*="test with image comparison diff/chrom"]');
                    await treeItem.click();

                    const eyeElement = await browser.$('[data-qa="suite-badges"] a');
                    const link = await eyeElement.getAttribute('href');

                    await expect(eyeElement).toBeClickable();

                    expect(link).toBe('https://example.com:123/fixtures/testplane/index.html');
                });
            });
        });
    });
}
