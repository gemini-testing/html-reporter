const {Key} = require('webdriverio');

describe('View in browser button behavior', () => {
    beforeEach(async ({browser}) => {
        await browser.$('//*[contains(@class, "expand-dropdown")]//button').click();
        await browser.$('//*[contains(@class, "expand-popup")]//span[contains(normalize-space(), "All")]').click();
    });

    it('should be clickable', async ({browser}) => {
        const eyeElement = await browser.$('a.view-in-browser');

        await expect(eyeElement).toBeClickable();
    });

    it('should have correct link on startup', async ({browser}) => {
        const eyeElement = await browser.$('a[data-test-id="view-in-browser"]');
        const link = await eyeElement.getAttribute('href');

        expect(link).toBe('https://example.com:123/fixtures/testplane-eye/index.html');
    });

    it('should change in accordance to the baseHost in header', async ({browser}) => {
        const baseHostInput = await browser.$('[data-qa="base-host"]').$('input');
        await baseHostInput.click();
        baseHostInput.setValue('http://some-host.dev:33');
        await browser.keys([Key.Enter]);

        const eyeElement = await browser.$('a[data-test-id="view-in-browser"]');
        const link = await eyeElement.getAttribute('href');

        expect(link).toBe('http://some-host.dev:33/fixtures/testplane-eye/index.html');
    });
});
