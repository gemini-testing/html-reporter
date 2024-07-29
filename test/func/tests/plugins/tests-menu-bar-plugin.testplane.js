describe('Test menu bar plugin', function() {
    const selector = '.menu-bar__dropdown';

    it('should show menu bar with plugins applied', async ({browser}) => {
        await browser.$(selector).waitForDisplayed();
        await browser.assertView('menu bar plugins', selector);
    });

    it('should show menu bar item on click', async ({browser}) => {
        const menuSelector = '.menu-bar__content';

        await browser.$(selector).waitForDisplayed();
        await browser.$(selector).click();
        await browser.$(menuSelector).waitForDisplayed();

        // Pause prevents flaky screenshots due to dropdown shadow rendering. No, screenshot delay doesn't help.
        await browser.pause(1000);
        await browser.assertView('menu bar plugins clicked', [selector, menuSelector]);
    });
});

