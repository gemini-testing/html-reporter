const {mkNestedSelector} = require('../../utils');

describe('Test basic plugin', function() {
    it('should show tests result with plugins applied', async function() {
        const selector = mkNestedSelector(
            '.section .section_status_error',
            '.section .section__body'
        );

        await this.browser.$(selector).waitForDisplayed();
        await this.browser.assertView('basic plugins', selector);
    });

    it('should change plugin basic border color on click', async function() {
        const screenSelector = mkNestedSelector(
            '.section .section_status_error',
            '.section .section__body'
        );

        const clickSelector = mkNestedSelector(
            '.section .section_status_error',
            '.red-border.basic-border'
        );

        await this.browser.$(screenSelector).waitForDisplayed();
        await this.browser.$(clickSelector).click();
        await this.browser.assertView('basic plugins clicked', screenSelector);
    });
});
