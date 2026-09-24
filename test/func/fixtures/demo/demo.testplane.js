'use strict';

require('../../tests/common/error-group.testplane');
require('../../tests/common/test-results-appearance.testplane');
require('../../tests/common/tests-details.testplane');
require('../../tests/common/tests-header.testplane');

describe('testplane', () => {
    describe('New UI', () => {
        describe('Suites page', () => {
            describe('Expand/collapse suites tree button', () => {
                it('should offer to collapse by default', async ({browser}) => {
                    const menuButton = await browser.$('[data-qa="tree-show"]');

                    await expect(menuButton).toHaveElementClass('gn-composite-bar-item_current');
                });

                it('should offer to expand when collapsed using button', async ({browser}) => {
                    const collapseButton = await browser.$('[data-qa="tree-collapse"]');

                    await collapseButton.click();
                    await browser.$('[data-qa="tree-show"]').click();

                    await collapseButton.assertView('button');
                });

                it('should offer to expand when collapsed manually', async ({browser}) => {
                    const gutterHandle = await browser.$('[data-qa="split-view-gutter-handle"]');

                    await browser.action('pointer')
                        .move({origin: gutterHandle})
                        .down()
                        .move({x: 0, y: 0, origin: 'viewport'})
                        .up()
                        .perform();

                    const menuButton = await browser.$('[data-qa="tree-collapse"]');

                    await expect(menuButton).toHaveElementClass('gn-composite-bar-item_current');
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
