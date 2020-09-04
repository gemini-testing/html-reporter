const {mkNestedSelector} = require('../utils');

describe('Test basic plugin', function() {
    it('should show tests result with plugins applied', async function() {
        const selector = mkNestedSelector(
            '.section .section_status_error',
            '.section .section__body'
        );

        return this.browser
            .waitForVisible(selector)
            .assertView('basic plugins', selector);
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

        return this.browser
            .waitForVisible(screenSelector)
            .click(clickSelector)
            .assertView('basic plugins clicked', screenSelector);
    });
});
