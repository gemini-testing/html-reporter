const {interceptClipboard, getClipboardValue} = require('../../../utils');

if (process.env.TOOL === 'testplane') {
    describe(process.env.TOOL || 'Default', () => {
        describe('New UI', () => {
            describe('Suites page', () => {
                describe('Copy buttons', () => {
                    it('should copy full suite path from suite title', async ({browser}) => {
                        await interceptClipboard(browser);

                        const testElement = await browser.$('[data-list-item="failed describe/test with image comparison diff/chrome"]');
                        await testElement.click();

                        const titleElement = await browser.$('h2');
                        await titleElement.moveTo();

                        const copyButton = await titleElement.$('button[title="Copy to clipboard"]');
                        await copyButton.waitForClickable();
                        await copyButton.click();

                        const clipboardText = await getClipboardValue(browser);

                        expect(clipboardText).toBe('failed describe test with image comparison diff');
                    });

                    it('should copy full suite path from tree view item', async ({browser}) => {
                        await interceptClipboard(browser);

                        const treeItem = await browser.$('[data-list-item*="test with image comparison diff"]');
                        await treeItem.moveTo();

                        const copyButton = await treeItem.$('button[title="Copy title"]');
                        await copyButton.waitForClickable();
                        await copyButton.click();

                        const clipboardText = await getClipboardValue(browser);

                        expect(clipboardText).toContain('test with image comparison diff');
                    });
                });
            });

            describe('Visual checks page', () => {
                describe('Copy buttons', () => {
                    it('should copy suite path without browser name from tree view item', async ({browser}) => {
                        await interceptClipboard(browser);

                        await browser.keys('v');

                        const visualChecksTitle = await browser.$('[data-qa="sidebar-title"]');
                        await expect(visualChecksTitle).toHaveText('Visual Checks');

                        const treeItem = await browser.$('[data-list-item*="test with image comparison diff"]');
                        await treeItem.moveTo();

                        const copyButton = await treeItem.$('button[title="Copy title"]');
                        await copyButton.waitForClickable();
                        await copyButton.click();

                        const clipboardText = await getClipboardValue(browser);

                        expect(clipboardText).not.toContain('chrome');
                        expect(clipboardText).toContain('test with image comparison diff');
                    });
                });
            });
        });
    });
}

