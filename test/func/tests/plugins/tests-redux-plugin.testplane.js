const {mkNestedSelector} = require('../../utils');

describe('Test redux plugin', function() {
    it('should change plugin redux border color on click', async ({browser}) => {
        const screenSelector = mkNestedSelector(
            '.section .section_status_error',
            '.section .section__body'
        );

        const clickSelector = mkNestedSelector(
            '.section .section_status_error',
            '.red-border.redux-border'
        );

        await browser.$(screenSelector).waitForDisplayed();
        await browser.$(clickSelector).click();
        await browser.assertView('redux plugin clicked', screenSelector);
    });
});
