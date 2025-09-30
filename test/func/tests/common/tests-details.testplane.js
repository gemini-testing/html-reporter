const {getTestSectionByNameSelector, getElementWithTextSelector, hideHeader} = require('../utils');

describe(process.env.TOOL || 'Default', () => {
    describe('Test details', function() {
        beforeEach(async ({browser}) => {
            await hideHeader(browser);
        });

        it('should show details', async ({browser}) => {
            const selector = getTestSectionByNameSelector('test with long error message');
            await browser.$(selector).waitForDisplayed();

            await browser.$(selector).$('.details__summary').scrollIntoView();
            await browser.$(selector).$('.details__summary').click();

            const metaInfo = await browser.$(selector).$('dl[data-qa="meta-info"]');

            await expect(metaInfo.$('dt*=file')).toBeDisplayed();
            await expect(metaInfo.$('dd*=failed-describe')).toBeDisplayed();
        });

        it('should prevent details summary overflow', async ({browser}) => {
            const selector =
                getTestSectionByNameSelector('test with long error message') +
                `//section[contains(@class, 'error__item') and .${getElementWithTextSelector('span', 'stack')}/..]`;

            await browser.$(selector).waitForDisplayed();
            await browser.waitUntil(() => browser.execute(() => document.fonts.status === 'loaded'));
            await browser.assertView('details summary', selector);
        });
    });
});
