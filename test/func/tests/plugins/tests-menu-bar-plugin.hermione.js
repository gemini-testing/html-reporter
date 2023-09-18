const {mkNestedSelector} = require('../../utils');

describe('Test menu bar plugin', function() {
    const selector = 'div[data-test-id="menu-bar"]';

    it('should show menu bar with plugins applied', async ({browser}) => {
        await browser.$(selector).waitForDisplayed();
        await browser.assertView('menu bar plugins', selector);
    });

    it('should show menu bar item on click', async ({browser}) => {
        const menuSelector = mkNestedSelector(selector, '.menu');

        await browser.$(selector).waitForDisplayed();
        await browser.$(selector).click();
        await browser.$(menuSelector).waitForDisplayed();
        await browser.assertView('menu bar plugins clicked', [selector, menuSelector]);
    });
});

