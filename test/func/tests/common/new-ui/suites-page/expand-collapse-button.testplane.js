if (process.env.TOOL === 'testplane') {
    describe('New UI', () => {
        describe('Suites page', () => {
            describe('Expand/collapse suites tree button', () => {
                it('should offer to collapse by default', async ({browser}) => {
                    const expandCollapseButton = await browser.$('[data-qa="expand-collapse-suites-tree"]');
                    await expandCollapseButton.moveTo();

                    await expandCollapseButton.assertView('button');

                    const tooltip = await browser.$('.gn-composite-bar-item__icon-tooltip');
                    await tooltip.assertView('tooltip');
                });

                it('should offer to expand when collapsed using button', async ({browser}) => {
                    const expandCollapseButton = await browser.$('[data-qa="expand-collapse-suites-tree"]');
                    await expandCollapseButton.click();
                    await expandCollapseButton.moveTo();

                    await expandCollapseButton.assertView('button');

                    const tooltip = await browser.$('.gn-composite-bar-item__icon-tooltip');
                    await tooltip.assertView('tooltip');
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

                    const expandCollapseButton = await browser.$('[data-qa="expand-collapse-suites-tree"]');
                    await expandCollapseButton.moveTo();

                    await expandCollapseButton.assertView('button');

                    const tooltip = await browser.$('.gn-composite-bar-item__icon-tooltip');
                    await tooltip.assertView('tooltip');
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
}
