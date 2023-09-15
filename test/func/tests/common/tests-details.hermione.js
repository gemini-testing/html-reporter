const {mkNestedSelector} = require('../utils');

describe('Test details', function() {
    it('should show details', async function() {
        const erroredTestSection = await this.browser.$('div*=test with long error message').$('../..');

        await erroredTestSection.waitForDisplayed();

        await erroredTestSection.$('.details__summary').click();

        const fileMetaInfo = await erroredTestSection.$('div=test/func/fixtures/failed-describe.hermione.js').$('..');

        await expect(fileMetaInfo).toBeDisplayed();
        await expect(await fileMetaInfo.$('span*=file')).toBeDisplayed();
    });

    it('should prevent details summary overflow', async function() {
        const selector = mkNestedSelector(
            '.section .section_status_error', // TODO: make selector to test by title
            '.error .details__summary'
        );

        await this.browser.$(selector).waitForDisplayed();
        await this.browser.assertView('details summary', selector);
    });
});
