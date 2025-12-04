const {getTestSectionByNameSelector} = require('../../../utils');

if (process.env.TOOL === 'testplane') {
    describe(process.env.TOOL || 'Default', () => {
        describe('New UI', () => {
            describe('Suites page', () => {
                describe('Legacy URL migration', () => {
                    const getHash = async (browser) => {
                        const currentUrl = new URL(await browser.getUrl());
                        return currentUrl.hash.slice(1);
                    };

                    const getQueryParams = async (browser) => {
                        const currentUrl = await browser.getUrl();
                        const url = new URL(currentUrl);
                        return url.search;
                    };

                    const interceptClipboard = async (browser) => {
                        await browser.execute(() => {
                            window.__copiedText = null;
                            const originalExecCommand = document.execCommand.bind(document);
                            document.execCommand = (command, ...args) => {
                                if (command === 'copy') {
                                    const activeEl = document.activeElement;
                                    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
                                        window.__copiedText = activeEl.value;
                                    }
                                }
                                return originalExecCommand(command, ...args);
                            };
                        });
                    };

                    const getCopiedText = async (browser) => {
                        return browser.execute(() => window.__copiedText);
                    };

                    it('should migrate from old UI link to new UI with correct test, browser and attempt', async ({browser}) => {
                        await browser.url(browser.options.baseUrl);

                        await interceptClipboard(browser);

                        const testSection = await browser.$(getTestSectionByNameSelector('test with image comparison diff'));
                        const copyButton = await testSection.$('button[title="copy test link"]');
                        await copyButton.waitForDisplayed();
                        await copyButton.click();

                        const copiedUrl = await getCopiedText(browser);
                        expect(copiedUrl).toBeTruthy();

                        const newUiUrl = new URL(copiedUrl);
                        newUiUrl.pathname += 'new-ui.html';
                        await browser.url(newUiUrl.toString());

                        const titleElement = await browser.$('[data-qa="suite-title"]');
                        await expect(titleElement).toHaveText('test with image comparison diff');

                        const retrySwitcher = await browser.$('[data-qa="retry-switcher"][data-qa-active="true"]');
                        await expect(retrySwitcher).toHaveText('2');

                        const hash = await getHash(browser);
                        expect(hash).toMatch(/^\/suites\/[a-z0-9]+\/chrome\/\d+/);

                        const queryString = await getQueryParams(browser);
                        expect(queryString).not.toContain('testNameFilter');
                        expect(queryString).not.toContain('strictMatchFilter');
                        expect(queryString).not.toContain('retryIndex');
                    });

                    it('should show notification when test not found', async ({browser}) => {
                        const baseUrl = browser.options.baseUrl;
                        const params = new URLSearchParams({
                            browser: 'chrome',
                            testNameFilter: 'non-existent test that does not exist',
                            strictMatchFilter: 'true',
                            retryIndex: '0',
                            viewModes: 'all',
                            expand: 'all'
                        });

                        await browser.url(baseUrl + 'new-ui.html?' + params.toString());

                        const toast = await browser.$('.g-toaster');
                        await browser.waitUntil(async () => {
                            const text = await toast.getText();
                            return text.includes('Test not found');
                        });

                        const queryString = await getQueryParams(browser);
                        expect(queryString).not.toContain('testNameFilter');
                        expect(queryString).not.toContain('strictMatchFilter');

                        await expect(browser.$('[data-qa="tree-view-item"]')).toBeDisplayed();
                    });
                });
            });
        });
    });
}
