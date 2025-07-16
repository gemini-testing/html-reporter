if (process.env.TOOL === 'testplane') {
    describe(process.env.TOOL || 'Default', () => {
        describe('New UI', () => {
            describe('Visual checks page', () => {
                describe('Expand/collapse visual checks list button', () => {
                    beforeEach(async ({browser}) => {
                        const menuItem = await browser.$('[data-qa="visual-checks-page-menu-item"]');
                        await menuItem.click();
                    });

                    it('page open', async ({browser}) => {
                        const pageTitle = await browser.$('[data-qa="sidebar-title"]');

                        await expect(pageTitle).toHaveText('Visual Checks');
                    });

                    it('move to suites and back', async ({browser}) => {
                        const pageTitle = await browser.$('[data-qa="sidebar-title"]');
                        const rightSideTitle = await browser.$('h2.text-display-1');

                        const secondElement = await browser.$('[data-qa="tree-view-list"] > div + div');
                        await secondElement.click();

                        const goSuitesElement = await browser.$('[data-qa="go-suites-button"]');
                        goSuitesElement.click();

                        await expect(pageTitle).toHaveText('Suites');
                        await expect(rightSideTitle).toHaveText('test with image comparison diff');

                        const goVisualElement = await browser.$('[data-qa="go-visual-button"]');
                        goVisualElement.click();

                        await expect(pageTitle).toHaveText('Visual Checks');
                        await expect(rightSideTitle).toHaveText('test with image comparison diff');
                    });

                    it('change url after select screenshot', async ({browser}) => {
                        const secondElement = await browser.$('[data-qa="tree-view-list"] > div + div');
                        await secondElement.click();

                        const currentUrl = await browser.getUrl();
                        const hash = currentUrl.split('#')[1];

                        await expect(hash).toBe('/visual-checks/failed%20describe%20test%20with%20image%20comparison%20diff%20chrome%20header/1');
                    });

                    it('open screenshot by url', async ({browser}) => {
                        await browser.url('/fixtures/testplane/report/new-ui.html#/visual-checks/failed%20describe%20test%20with%20image%20comparison%20diff%20chrome%20header/1');
                        await browser.execute(() => window.location.reload()); // need for catch data from changed hash

                        const rightSideTitle = await browser.$('h2.text-display-1');

                        await expect(rightSideTitle).toHaveText('test with image comparison diff');
                    });

                    it('click to screenshot', async ({browser}) => {
                        const secondElement = await browser.$('[data-qa="tree-view-list"] > div + div');
                        await secondElement.click();

                        const rightSideTitle = await browser.$('h2.text-display-1');

                        await expect(rightSideTitle).toHaveText('test with image comparison diff');
                    });

                    it('select only failed', async ({browser}) => {
                        const failedOption = await browser.$('[title="Failed"] > input');
                        await failedOption.click();

                        const list = await browser.$('[data-qa="tree-view-list"]');

                        await expect(list).toHaveChildren(3);
                    });

                    it('should offer to collapse by default', async ({browser}) => {
                        const expandCollapseButton = await browser.$('[data-qa="expand-collapse-visual-checks"]');
                        await expandCollapseButton.moveTo();

                        await expandCollapseButton.assertView('button');

                        const tooltip = await browser.$('.gn-composite-bar-item__icon-tooltip');
                        await expect(tooltip).toHaveText('Collapse tree');
                    });

                    it('should offer to expand when collapsed using button', async ({browser}) => {
                        const expandCollapseButton = await browser.$('[data-qa="expand-collapse-visual-checks"]');
                        await expandCollapseButton.click();
                        await expandCollapseButton.moveTo();

                        await expandCollapseButton.assertView('button');

                        const tooltip = await browser.$('.gn-composite-bar-item__icon-tooltip');
                        await expect(tooltip).toHaveText('Expand tree');
                    });

                    it('should offer to expand when collapsed manually', async ({browser}) => {
                        const gutterHandle = await browser.$('[data-qa="split-view-gutter-handle"]');

                        await browser.action('pointer')
                            .move({origin: gutterHandle})
                            .down()
                            .move({x: 0, y: 0, origin: 'viewport'})
                            .up()
                            .perform();

                        await browser.pause(500);

                        const expandCollapseButton = await browser.$('[data-qa="expand-collapse-visual-checks"]');
                        await expandCollapseButton.moveTo();

                        await expandCollapseButton.assertView('button');

                        const tooltip = await browser.$('.gn-composite-bar-item__icon-tooltip');
                        await expect(tooltip).toHaveText('Expand tree');
                    });
                });

                it('section sizes should be preserved after page reload', async ({browser}) => {
                    const gutterHandle = await browser.$('[data-qa="split-view-gutter-handle"]');

                    await browser.action('pointer')
                        .move({origin: gutterHandle})
                        .down()
                        .move({x: 200, y: 0, origin: 'pointer'})
                        .up()
                        .perform();

                    const suitesTreeBefore = await browser.$('[data-qa="suites-tree-card"]');
                    const sizeBefore = await suitesTreeBefore.getSize();

                    await browser.refresh();

                    const suitesTreeAfter = await browser.$('[data-qa="suites-tree-card"]');
                    const sizeAfter = await suitesTreeAfter.getSize();

                    expect(sizeBefore).toEqual(sizeAfter);
                });
            });
        });
    });
}
