const {mkNestedSelector} = require('../utils');

describe('Test menu bar plugin', function() {
    const selector = '.main-menu .menu-bar';

    it('should show menu bar with plugins applied', async function() {
        return this.browser
            .waitForVisible(selector)
            .assertView('menu bar plugins', selector);
    });

    it('should show menu bar item on click', async function() {
        const menuSelector = mkNestedSelector(selector, '.menu');

        return this.browser
            .waitForVisible(selector)
            .click(selector)
            .waitForVisible(menuSelector)
            .assertView('menu bar plugins clicked', [selector, menuSelector]);
    });
});

