const {Key} = require('webdriverio');

describe('View in browser button behavior', () => {
    beforeEach(async ({browser}) => {
        await browser.$('button*=Expand all').click();
    });

    it('should be clickable', async ({browser}) => {
        const eyeElement = await browser.$('a.view-in-browser');

        await expect(eyeElement).toBeClickable();
    });

    it('should have correct link on startup', async ({browser}) => {
        const eyeElement = await browser.$('a[data-test-id="view-in-browser"]');
        const link = await eyeElement.getAttribute('href');

        expect(link).toBe('https://example.com:123/fixtures/hermione-eye/index.html');
    });

    it('should change in accordance to the baseHost in header', async ({browser}) => {
        const baseHostInput = await browser.$('input[data-test-id="base-host"]');
        await baseHostInput.click();
        baseHostInput.setValue('http://some-host.dev:33');
        await browser.keys([Key.Enter]);

        const eyeElement = await browser.$('a[data-test-id="view-in-browser"]');
        const link = await eyeElement.getAttribute('href');

        expect(link).toBe('http://some-host.dev:33/fixtures/hermione-eye/index.html');
    });
});
