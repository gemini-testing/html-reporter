const {mkNestedSelector} = require('../../utils');

describe('Test menu bar plugin', function() {
    const selector = 'div[data-test-id="menu-bar"]';

    it('should show menu bar with plugins applied', async function() {
        await this.browser.$(selector).waitForDisplayed();
        await this.browser.assertView('menu bar plugins', selector);
    });

    it('should show menu bar item on click', async function() {
        const menuSelector = mkNestedSelector(selector, '.menu');

        await this.browser.$(selector).waitForDisplayed();
        await this.browser.$(selector).click();
        await this.browser.$(menuSelector).waitForDisplayed();
        await this.browser.assertView('menu bar plugins clicked', [selector, menuSelector]);
    });
});

