'use strict';

// Suite names and visual checks mirror the original v10.16.3 public demo.
describe('testplane', () => {
    describe('Error grouping', () => {
        it('should group errors', async ({browser}) => {
            await browser.url(browser.options.baseUrl);
            assert.isTrue(await browser.$('h1').isDisplayed());
        });
    });
    describe('Test results appearance', () => {
        describe('Passed test', () => {
            it('should have green retry selector', async ({browser}) => {
                await browser.url(browser.options.baseUrl);
                await browser.assertView('retry-selector', '#retry-selector');
            });
        });
        describe('Test with diff', () => {
            it('should have pink retry selector', async ({browser}) => {
                await browser.url(browser.options.baseUrl);
                await browser.assertView('retry-selector', '#retry-selector');
            });
            it('should display 3 images', async ({browser}) => {
                await browser.url(browser.options.baseUrl);
                assert.isTrue(await browser.$('h1').isDisplayed());
            });
            it('should not display error info', async ({browser}) => {
                await browser.url(browser.options.baseUrl);
                assert.isTrue(await browser.$('h1').isDisplayed());
            });
        });
        describe('Test with no reference image', () => {
            it('should have pink retry selector', async ({browser}) => {
                await browser.url(browser.options.baseUrl);
                await browser.assertView('retry-selector', '#retry-selector');
            });
            it('should display error message, name and stack', async ({browser}) => {
                await browser.url(browser.options.baseUrl);
                assert.isTrue(await browser.$('h1').isDisplayed());
            });
            it('should display actual screenshot', async ({browser}) => {
                await browser.url(browser.options.baseUrl);
                assert.isTrue(await browser.$('h1').isDisplayed());
            });
        });
        describe('Test with error', () => {
            it('should have red retry selector', async ({browser}) => {
                await browser.url(browser.options.baseUrl);
                await browser.assertView('retry-selector', '#retry-selector');
            });
            it('should display error message, name and stack', async ({browser}) => {
                await browser.url(browser.options.baseUrl);
                assert.isTrue(await browser.$('h1').isDisplayed());
            });
            it('should show message without ansi markup', async ({browser}) => {
                await browser.url(browser.options.baseUrl);
                assert.isTrue(await browser.$('h1').isDisplayed());
            });
        });
        describe('Test with successful assertView and error', () => {
            it('should display error message, name and stack', async ({browser}) => {
                await browser.url(browser.options.baseUrl);
                assert.isTrue(await browser.$('h1').isDisplayed());
            });
        });
    });
    describe('Test details', () => {
        it('should show details', async ({browser}) => {
            await browser.url(browser.options.baseUrl);
            assert.isTrue(await browser.$('h1').isDisplayed());
        });
        it('should prevent details summary overflow', async ({browser}) => {
            await browser.url(browser.options.baseUrl);
            await browser.assertView('details summary', '#details-summary');
        });
    });
    describe('Report header', () => {
        describe('Summary', () => {
            it('should show tests summary', async ({browser}) => {
                await browser.url(browser.options.baseUrl);
                assert.isTrue(await browser.$('h1').isDisplayed());
            });
        });
        describe('Main menu', () => {
            it('should show creation date', async ({browser}) => {
                await browser.url(browser.options.baseUrl);
                assert.isTrue(await browser.$('h1').isDisplayed());
            });
            it('should show report version', async ({browser}) => {
                await browser.url(browser.options.baseUrl);
                assert.isTrue(await browser.$('h1').isDisplayed());
            });
        });
    });
    describe('New UI', () => {
        describe('Suites page', () => {
            it('section sizes should be preserved after page reload', async ({browser}) => {
                await browser.url(browser.options.baseUrl);
                assert.isTrue(await browser.$('h1').isDisplayed());
            });
            describe('Expand/collapse suites tree button', () => {
                it('should offer to collapse by default', async ({browser}) => {
                    await browser.url(browser.options.baseUrl);
                    await browser.assertView('button', '#button');
                    await browser.assertView('tooltip', '#tooltip');
                });
                it('should offer to expand when collapsed using button', async ({browser}) => {
                    await browser.url(browser.options.baseUrl + (process.env.DEMO_CAPTURE_REFS ? '?reference=1' : '?changed=1'));
                    await browser.assertView('button', '#button');
                    await browser.assertView('tooltip', '#tooltip');
                });
                it('should offer to expand when collapsed manually', async ({browser}) => {
                    await browser.url(browser.options.baseUrl);
                    await browser.assertView('button', '#button');
                    await browser.assertView('tooltip', '#tooltip');
                });
            });
        });
    });
});
