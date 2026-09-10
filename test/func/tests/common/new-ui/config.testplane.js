const {interceptClipboard, getClipboardValue} = require('../../utils');

if (process.env.TOOL === 'testplane') {
    describe(process.env.TOOL || 'Default', () => {
        describe('New UI', () => {
            describe('Config', () => {
                it('should open Testplane config dialog and copy config data', async ({browser}) => {
                    await interceptClipboard(browser);

                    await browser.$('[data-qa="footer-item-info"]').click();
                    await browser.$('[data-qa="open-config-button"]').click();

                    const dialogHeader = await browser.$('.g-dialog-header__caption');

                    await expect(dialogHeader).toBeDisplayed();
                    await expect(dialogHeader).toHaveText('Testplane config');

                    const copyConfigPathButton = await browser.$('[data-qa="copy-config-path"]');
                    await copyConfigPathButton.waitForClickable();
                    await copyConfigPathButton.click();

                    const copiedConfigPath = await getClipboardValue(browser);
                    expect(copiedConfigPath.length).toBeGreaterThan(20);

                    await browser.execute(() => {
                        window.__copiedText = null;
                    });

                    const toolConfig = await browser.$('[data-qa="tool-config"]');
                    await toolConfig.moveTo();

                    const copyConfigButton = await browser.$('[data-qa="copy-config"]');
                    await copyConfigButton.waitForClickable();
                    await copyConfigButton.click();

                    const copiedConfig = await getClipboardValue(browser);
                    expect(copiedConfig.length).toBeGreaterThan(20);
                });
            });
        });
    });
}
