const {getTestSectionByNameSelector, getElementWithTextSelector, hideHeader} = require('../utils');

describe('Test details', function() {
    beforeEach(async ({browser}) => {
        await hideHeader(browser);
    });

    it('should show details', async ({browser}) => {
        await browser.$('div*=test with long error message').waitForDisplayed();

        const erroredTestSection = await browser.$('div*=test with long error message').$('../..');

        await erroredTestSection.$('.details__summary').click();

        const fileMetaInfo = await erroredTestSection.$('div*=failed-describe').$('..');

        await expect(fileMetaInfo).toBeDisplayed();
        await expect(await fileMetaInfo.$('span*=file')).toBeDisplayed();
    });

    it('should prevent details summary overflow', async ({browser}) => {
        const selector =
            getTestSectionByNameSelector('test with long error message') +
            `//summary[.${getElementWithTextSelector('span', 'message')}/..]`;

        await browser.$(selector).waitForDisplayed();
        await browser.assertView('details summary', selector);
    });
});
