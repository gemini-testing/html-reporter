const {mkNestedSelector} = require('../../utils');

describe('Test basic plugin', function() {
    it('should show tests result with plugins applied', async ({browser}) => {
        const selector = mkNestedSelector(
            '.section .section_status_error',
            '.section .section__body'
        );

        await browser.$(selector).waitForDisplayed();
        await browser.assertView('basic plugins', selector);
    });

    it('should change plugin basic border color on click', async ({browser}) => {
        const screenSelector = mkNestedSelector(
            '.section .section_status_error',
            '.section .section__body'
        );

        const clickSelector = mkNestedSelector(
            '.section .section_status_error',
            '.red-border.basic-border'
        );

        await browser.$(screenSelector).waitForDisplayed();
        await browser.$(clickSelector).click();
        await browser.assertView('basic plugins clicked', screenSelector);
    });
});
