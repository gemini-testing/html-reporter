const {getClipboardValue, interceptClipboard} = require('../../utils');

if (process.env.TOOL === 'testplane') {
    describe(process.env.TOOL || 'Default', () => {
        describe('New UI', () => {
            describe('Config', () => {
                const openConfigDialog = async browser => {
                    await browser.$('[data-qa="footer-item-info"]').click();
                    await browser.$('[data-qa="open-config-button"]').click();

                    const dialogHeader = await browser.$('.g-dialog-header__caption');

                    await expect(dialogHeader).toBeDisplayed();
                    await expect(dialogHeader).toHaveText('Testplane config');
                };

                it('should copy Testplane config path', async ({browser}) => {
                    await openConfigDialog(browser);

                    await interceptClipboard(browser);
                    const copyConfigPathButton = await browser.$('[data-qa="copy-config-path"]');
                    await copyConfigPathButton.waitForClickable();
                    await copyConfigPathButton.click();

                    const copiedConfigPath = await getClipboardValue(browser);
                    await expect(copiedConfigPath).toContain('.testplane.conf.js');
                });

                it('should copy Testplane config', async ({browser}) => {
                    await openConfigDialog(browser);

                    const toolConfig = await browser.$('[data-qa="tool-config"]');
                    await toolConfig.moveTo();

                    await interceptClipboard(browser);
                    const copyConfigButton = await browser.$('[data-qa="copy-config"]');
                    await copyConfigButton.waitForClickable();
                    await copyConfigButton.click();

                    const copiedConfig = await getClipboardValue(browser);
                    await expect(copiedConfig).toContain('"gridUrl": "http://127.0.0.1:4444/",');
                });
            });
        });
    });
}
