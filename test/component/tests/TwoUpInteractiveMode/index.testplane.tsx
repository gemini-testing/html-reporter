import React from 'react';
import {render} from '@testing-library/react';
import {TwoUpInteractiveModePure} from '../../../../lib/static/new-ui/components/DiffViewer/TwoUpInteractiveMode';
import {TwoUpFitMode} from '../../../../lib/constants';
import type {ImageFile} from '../../../../lib/types';
import {ThemeProvider} from '@gravity-ui/uikit';
import {Key} from 'testplane';

import '../../styles.css';

async function waitForFonts(browser: WebdriverIO.Browser): Promise<void> {
    await browser.waitUntil(
        async () => {
            return await browser.execute(() => {
                return document.fonts.ready.then(() => true);
            });
        },
        {
            timeout: 5000,
            timeoutMsg: 'Fonts did not load within 5 seconds'
        }
    );
}

import expectedStandard from './images/standard/expected.png';
import diffStandard from './images/standard/diff.png';
import actualStandard from './images/standard/actual.png';

import expectedWide from './images/mismatched/expected-wide.png';
import expectedDetailed from './images/detailed/expected-detailed.png';
import actualDetailed from './images/detailed/actual-detailed.png';
import expectedPortrait from './images/portrait/expected-portrait.png';
import actualPortrait from './images/portrait/actual-portrait.png';

import expectedLandscape from './images/landscape/expected-landscape.png';
import actualLandscape from './images/landscape/actual-landscape.png';
import actualTall from './images/mismatched/actual-tall.png';

import expectedButton from './images/button/expected-button.png';
import actualButton from './images/button/actual-button.png';

describe('TwoUpInteractiveMode', () => {
    describe('Side-by-Side Display', () => {
        it('displays both expected and actual images side-by-side', async ({browser}) => {
            const expected: ImageFile = {path: expectedStandard, size: {width: 1920, height: 1080}};
            const actual: ImageFile = {path: actualStandard, size: {width: 1920, height: 1080}};

            render(
                <ThemeProvider theme='light'>
                    <TwoUpInteractiveModePure
                        expected={expected}
                        actual={actual}
                        is2UpDiffVisible={false}
                        globalTwoUpFitMode={TwoUpFitMode.FitToView}
                    />
                </ThemeProvider>
            );

            const container = await browser.$('[data-testid="two-up-interactive-mode"]');
            await waitForFonts(browser);
            await container.assertView('side-by-side-display');
        });

        it('shows image dimensions in labels', async ({browser}) => {
            const expected: ImageFile = {path: expectedStandard, size: {width: 1920, height: 1080}};
            const actual: ImageFile = {path: actualStandard, size: {width: 1920, height: 1080}};

            render(
                <ThemeProvider theme='light'>
                    <TwoUpInteractiveModePure
                        expected={expected}
                        actual={actual}
                        is2UpDiffVisible={false}
                        globalTwoUpFitMode={TwoUpFitMode.FitToView}
                    />
                </ThemeProvider>
            );

            const expectedLabel = await browser.findByTestId('image-label-expected');
            const actualLabel = await browser.findByTestId('image-label-actual');

            const expectedText = await expectedLabel.getText();
            const actualText = await actualLabel.getText();

            expect(expectedText).toContain('1920');
            expect(expectedText).toContain('1080');
            expect(actualText).toContain('1920');
            expect(actualText).toContain('1080');
        });

        it('shows diff statistics when available', async ({browser}) => {
            const expected: ImageFile = {path: expectedStandard, size: {width: 1920, height: 1080}};
            const actual: ImageFile = {path: actualStandard, size: {width: 1920, height: 1080}};

            render(
                <ThemeProvider theme='light'>
                    <TwoUpInteractiveModePure
                        expected={expected}
                        actual={actual}
                        is2UpDiffVisible={false}
                        globalTwoUpFitMode={TwoUpFitMode.FitToView}
                        differentPixels={2500}
                        diffRatio={0.12}
                    />
                </ThemeProvider>
            );

            const actualLabel = await browser.findByTestId('image-label-actual');
            const labelText = await actualLabel.getText();

            // 2500 pixels is formatted as "~3k px"
            expect(labelText).toContain('~3k px');
            expect(labelText).toContain('different');
            expect(labelText).toContain('12');
        });

        it('handles images with different dimensions', async ({browser}) => {
            const expected: ImageFile = {path: expectedWide, size: {width: 1000, height: 200}};
            const actual: ImageFile = {path: actualTall, size: {width: 200, height: 900}};

            render(
                <ThemeProvider theme='light'>
                    <TwoUpInteractiveModePure
                        expected={expected}
                        actual={actual}
                        is2UpDiffVisible={false}
                        globalTwoUpFitMode={TwoUpFitMode.FitToView}
                    />
                </ThemeProvider>
            );

            const images = await browser.$$('img');
            await expect(images).toHaveLength(2);

            const container = await browser.$('[data-testid="two-up-interactive-mode"]');
            await waitForFonts(browser);
            await container.assertView('different-dimensions');
        });

        it('handles images with same dimensions', async ({browser}) => {
            const expected: ImageFile = {path: expectedStandard, size: {width: 1920, height: 1080}};
            const actual: ImageFile = {path: actualStandard, size: {width: 1920, height: 1080}};

            render(
                <ThemeProvider theme='light'>
                    <TwoUpInteractiveModePure
                        expected={expected}
                        actual={actual}
                        is2UpDiffVisible={false}
                        globalTwoUpFitMode={TwoUpFitMode.FitToView}
                    />
                </ThemeProvider>
            );

            const images = await browser.$$('img');
            await expect(images).toHaveLength(2);

            const container = await browser.$('[data-testid="two-up-interactive-mode"]');
            await waitForFonts(browser);
            await container.assertView('same-dimensions');
        });

        describe('Diff Overlay Visualization', () => {
            it('shows diff overlay when enabled', async ({browser}) => {
                const expected: ImageFile = {path: expectedStandard, size: {width: 1920, height: 1080}};
                const actual: ImageFile = {path: actualStandard, size: {width: 1920, height: 1080}};
                const diff: ImageFile = {path: diffStandard, size: {width: 1920, height: 1080}};

                render(
                    <ThemeProvider theme='light'>
                        <TwoUpInteractiveModePure
                            expected={expected}
                            actual={actual}
                            diff={diff}
                            is2UpDiffVisible={true}
                            globalTwoUpFitMode={TwoUpFitMode.FitToView}
                        />
                    </ThemeProvider>
                );

                const images = await browser.$$('img');
                await expect(images).toHaveLength(3);

                const container = await browser.$('[data-testid="two-up-interactive-mode"]');
                await waitForFonts(browser);
                await container.assertView('diff-overlay-visible');
            });

            it('hides diff overlay when disabled', async ({browser}) => {
                const expected: ImageFile = {path: expectedStandard, size: {width: 1920, height: 1080}};
                const actual: ImageFile = {path: actualStandard, size: {width: 1920, height: 1080}};
                const diff: ImageFile = {path: diffStandard, size: {width: 1920, height: 1080}};

                render(
                    <ThemeProvider theme='light'>
                        <TwoUpInteractiveModePure
                            expected={expected}
                            actual={actual}
                            diff={diff}
                            is2UpDiffVisible={false}
                            globalTwoUpFitMode={TwoUpFitMode.FitToView}
                        />
                    </ThemeProvider>
                );

                const images = await browser.$$('img');
                await expect(images).toHaveLength(2);

                const container = await browser.$('[data-testid="two-up-interactive-mode"]');
                await waitForFonts(browser);
                await container.assertView('diff-overlay-hidden');
            });

            it('diff overlay only appears on actual side', async ({browser}) => {
                const expected: ImageFile = {path: expectedStandard, size: {width: 1920, height: 1080}};
                const actual: ImageFile = {path: actualStandard, size: {width: 1920, height: 1080}};
                const diff: ImageFile = {path: diffStandard, size: {width: 1920, height: 1080}};

                render(
                    <ThemeProvider theme='light'>
                        <TwoUpInteractiveModePure
                            expected={expected}
                            actual={actual}
                            diff={diff}
                            is2UpDiffVisible={true}
                            globalTwoUpFitMode={TwoUpFitMode.FitToView}
                        />
                    </ThemeProvider>
                );

                const expectedPanel = await browser.$('[data-testid="image-panel-expected"]');
                const actualPanel = await browser.$('[data-testid="image-panel-actual"]');

                const expectedImages = await expectedPanel.$$('img');
                const actualImages = await actualPanel.$$('img');

                await expect(expectedImages).toHaveLength(1);
                await expect(actualImages).toHaveLength(2);
            });
        });
    });
});

describe('Zoom Controls', () => {
    it('zoom in button increases image size', async ({browser}) => {
        const expected: ImageFile = {path: expectedDetailed, size: {width: 800, height: 600}};
        const actual: ImageFile = {path: actualDetailed, size: {width: 800, height: 600}};

        render(
            <ThemeProvider theme='light'>
                <TwoUpInteractiveModePure
                    expected={expected}
                    actual={actual}
                    is2UpDiffVisible={false}
                    globalTwoUpFitMode={TwoUpFitMode.FitToView}
                />
            </ThemeProvider>
        );

        const zoomInButton = await browser.$('[title="Zoom in"]');
        await zoomInButton.click();

        const container = await browser.$('[data-testid="two-up-interactive-mode"]');
        await waitForFonts(browser);
        await container.assertView('zoom-in');
    });

    it('zoom out button decreases image size', async ({browser}) => {
        const expected: ImageFile = {path: expectedDetailed, size: {width: 800, height: 600}};
        const actual: ImageFile = {path: actualDetailed, size: {width: 800, height: 600}};

        render(
            <ThemeProvider theme='light'>
                <TwoUpInteractiveModePure
                    expected={expected}
                    actual={actual}
                    is2UpDiffVisible={false}
                    globalTwoUpFitMode={TwoUpFitMode.FitToView}
                />
            </ThemeProvider>
        );

        const zoomOutButton = await browser.$('[title="Zoom out"]');
        await zoomOutButton.click();

        const container = await browser.$('[data-testid="two-up-interactive-mode"]');
        await waitForFonts(browser);
        await container.assertView('zoom-out');
    });

    it('zoom centers on mouse cursor position', async ({browser}) => {
        const expected: ImageFile = {path: expectedDetailed, size: {width: 800, height: 600}};
        const actual: ImageFile = {path: actualDetailed, size: {width: 800, height: 600}};

        render(
            <ThemeProvider theme='light'>
                <TwoUpInteractiveModePure
                    expected={expected}
                    actual={actual}
                    is2UpDiffVisible={false}
                    globalTwoUpFitMode={TwoUpFitMode.FitToView}
                />
            </ThemeProvider>
        );

        const imageContainer = await browser.$('[data-testid="image-panel-expected"]');
        const size = await imageContainer.getSize();
        const offsetX = Math.round(-size.width / 2 + 2);
        const offsetY = Math.round(-size.height / 2 + 10);

        await browser.actions([
            browser.action('key').down(Key.Ctrl),
            browser.action('wheel').scroll({x: offsetX, y: offsetY, deltaX: 0, deltaY: -140, origin: imageContainer}),
            browser.action('key').up(Key.Ctrl)
        ]);

        const container = await browser.$('[data-testid="two-up-interactive-mode"]');
        await waitForFonts(browser);
        await container.assertView('zoom-centered');
    });

    it('zoom has minimum limit', async ({browser}) => {
        const expected: ImageFile = {path: expectedDetailed, size: {width: 800, height: 600}};
        const actual: ImageFile = {path: actualDetailed, size: {width: 800, height: 600}};

        render(
            <ThemeProvider theme='light'>
                <TwoUpInteractiveModePure
                    expected={expected}
                    actual={actual}
                    is2UpDiffVisible={false}
                    globalTwoUpFitMode={TwoUpFitMode.FitToView}
                />
            </ThemeProvider>
        );

        const zoomOutButton = await browser.$('[title="Zoom out"]');

        for (let i = 0; i < 20; i++) {
            await zoomOutButton.click();
        }

        const container = await browser.$('[data-testid="two-up-interactive-mode"]');
        await waitForFonts(browser);
        await container.assertView('zoom-min-limit');
    });

    it('zoom has maximum limit', async ({browser}) => {
        const expected: ImageFile = {path: expectedDetailed, size: {width: 800, height: 600}};
        const actual: ImageFile = {path: actualDetailed, size: {width: 800, height: 600}};

        render(
            <ThemeProvider theme='light'>
                <TwoUpInteractiveModePure
                    expected={expected}
                    actual={actual}
                    is2UpDiffVisible={false}
                    globalTwoUpFitMode={TwoUpFitMode.FitToView}
                />
            </ThemeProvider>
        );

        const zoomInButton = await browser.$('[title="Zoom in"]');

        for (let i = 0; i < 50; i++) {
            await zoomInButton.click();
        }

        const container = await browser.$('[data-testid="two-up-interactive-mode"]');
        await waitForFonts(browser);
        await container.assertView('zoom-max-limit');
    });
});

describe('Pan Navigation', () => {
    it('mouse drag pans the view', async ({browser}) => {
        const expected: ImageFile = {path: expectedDetailed, size: {width: 800, height: 600}};
        const actual: ImageFile = {path: actualDetailed, size: {width: 800, height: 600}};

        render(
            <ThemeProvider theme='light'>
                <TwoUpInteractiveModePure
                    expected={expected}
                    actual={actual}
                    is2UpDiffVisible={false}
                    globalTwoUpFitMode={TwoUpFitMode.FitToView}
                />
            </ThemeProvider>
        );

        const zoomInButton = await browser.$('[title="Zoom in"]');
        await zoomInButton.click();

        const imageContainer = await browser.$('[data-testid="image-panel-expected"]');

        await browser.actions([
            browser.action('pointer')
                .move({origin: imageContainer})
                .down()
                .move({x: 200, y: 100, origin: 'pointer'})
                .up()
        ]);

        const container = await browser.$('[data-testid="two-up-interactive-mode"]');
        await waitForFonts(browser);
        // Wait for momentum to finish
        await browser.pause(200);
        await container.assertView('pan-drag');
    });

    it('mouse wheel without Ctrl pans the view', async ({browser}) => {
        const expected: ImageFile = {path: expectedDetailed, size: {width: 800, height: 600}};
        const actual: ImageFile = {path: actualDetailed, size: {width: 800, height: 600}};

        render(
            <ThemeProvider theme='light'>
                <TwoUpInteractiveModePure
                    expected={expected}
                    actual={actual}
                    is2UpDiffVisible={false}
                    globalTwoUpFitMode={TwoUpFitMode.FitToView}
                />
            </ThemeProvider>
        );

        const zoomInButton = await browser.$('[title="Zoom in"]');
        await zoomInButton.click();

        const imageContainer = await browser.$('[data-testid="image-panel-expected"]');

        await browser
            .action('wheel')
            .scroll({deltaX: -200, deltaY: -100, x: 0, y: 0, origin: imageContainer})
            .perform();

        const container = await browser.$('[data-testid="two-up-interactive-mode"]');
        await waitForFonts(browser);
        // Wait for momentum to finish
        await browser.pause(200);
        await container.assertView('pan-wheel');
    });
});

describe('Fit Mode Controls', () => {
    describe('Landscape Images', () => {
        it('fit to width at default window size', async ({browser}) => {
            const expected: ImageFile = {path: expectedLandscape, size: {width: 1600, height: 400}};
            const actual: ImageFile = {path: actualLandscape, size: {width: 1600, height: 400}};

            render(
                <ThemeProvider theme='light'>
                    <TwoUpInteractiveModePure
                        expected={expected}
                        actual={actual}
                        is2UpDiffVisible={false}
                        globalTwoUpFitMode={TwoUpFitMode.FitToWidth}
                    />
                </ThemeProvider>
            );

            const container = await browser.$('[data-testid="two-up-interactive-mode"]');
            await waitForFonts(browser);
            await container.assertView('landscape-fit-to-width-default');
        });

        it('fit to width at reduced window size', async ({browser}) => {
            const expected: ImageFile = {path: expectedLandscape, size: {width: 1600, height: 400}};
            const actual: ImageFile = {path: actualLandscape, size: {width: 1600, height: 400}};

            render(
                <ThemeProvider theme='light'>
                    <TwoUpInteractiveModePure
                        expected={expected}
                        actual={actual}
                        is2UpDiffVisible={false}
                        globalTwoUpFitMode={TwoUpFitMode.FitToWidth}
                    />
                </ThemeProvider>
            );

            await browser.setWindowSize(800, 600);

            const container = await browser.$('[data-testid="two-up-interactive-mode"]');
            await waitForFonts(browser);
            await container.assertView('landscape-fit-to-width-reduced');
        });

        it('fit to view at default window size', async ({browser}) => {
            const expected: ImageFile = {path: expectedLandscape, size: {width: 1600, height: 400}};
            const actual: ImageFile = {path: actualLandscape, size: {width: 1600, height: 400}};

            render(
                <ThemeProvider theme='light'>
                    <TwoUpInteractiveModePure
                        expected={expected}
                        actual={actual}
                        is2UpDiffVisible={false}
                        globalTwoUpFitMode={TwoUpFitMode.FitToView}
                    />
                </ThemeProvider>
            );

            const container = await browser.$('[data-testid="two-up-interactive-mode"]');
            await waitForFonts(browser);
            await container.assertView('landscape-fit-to-view-default');
        });

        it('fit to view at reduced window size', async ({browser}) => {
            const expected: ImageFile = {path: expectedLandscape, size: {width: 1600, height: 400}};
            const actual: ImageFile = {path: actualLandscape, size: {width: 1600, height: 400}};

            render(
                <ThemeProvider theme='light'>
                    <TwoUpInteractiveModePure
                        expected={expected}
                        actual={actual}
                        is2UpDiffVisible={false}
                        globalTwoUpFitMode={TwoUpFitMode.FitToView}
                    />
                </ThemeProvider>
            );

            await browser.setWindowSize(800, 600);

            const container = await browser.$('[data-testid="two-up-interactive-mode"]');
            await waitForFonts(browser);
            await container.assertView('landscape-fit-to-view-reduced');
        });
    });

    describe('Portrait Images', () => {
        it('fit to width at default window size', async ({browser}) => {
            const expected: ImageFile = {path: expectedPortrait, size: {width: 600, height: 1200}};
            const actual: ImageFile = {path: actualPortrait, size: {width: 600, height: 1200}};

            render(
                <ThemeProvider theme='light'>
                    <TwoUpInteractiveModePure
                        expected={expected}
                        actual={actual}
                        is2UpDiffVisible={false}
                        globalTwoUpFitMode={TwoUpFitMode.FitToWidth}
                    />
                </ThemeProvider>
            );

            const container = await browser.$('[data-testid="two-up-interactive-mode"]');
            await waitForFonts(browser);
            await container.assertView('portrait-fit-to-width-default');
        });

        it('fit to width at reduced window size', async ({browser}) => {
            const expected: ImageFile = {path: expectedPortrait, size: {width: 600, height: 1200}};
            const actual: ImageFile = {path: actualPortrait, size: {width: 600, height: 1200}};

            render(
                <ThemeProvider theme='light'>
                    <TwoUpInteractiveModePure
                        expected={expected}
                        actual={actual}
                        is2UpDiffVisible={false}
                        globalTwoUpFitMode={TwoUpFitMode.FitToWidth}
                    />
                </ThemeProvider>
            );

            await browser.setWindowSize(800, 600);

            const container = await browser.$('[data-testid="two-up-interactive-mode"]');
            await waitForFonts(browser);
            await container.assertView('portrait-fit-to-width-reduced');
        });

        it('fit to view at default window size', async ({browser}) => {
            const expected: ImageFile = {path: expectedPortrait, size: {width: 600, height: 1200}};
            const actual: ImageFile = {path: actualPortrait, size: {width: 600, height: 1200}};

            render(
                <ThemeProvider theme='light'>
                    <TwoUpInteractiveModePure
                        expected={expected}
                        actual={actual}
                        is2UpDiffVisible={false}
                        globalTwoUpFitMode={TwoUpFitMode.FitToView}
                    />
                </ThemeProvider>
            );

            const container = await browser.$('[data-testid="two-up-interactive-mode"]');
            await waitForFonts(browser);
            await container.assertView('portrait-fit-to-view-default');
        });

        it('fit to view at reduced window size', async ({browser}) => {
            const expected: ImageFile = {path: expectedPortrait, size: {width: 600, height: 1200}};
            const actual: ImageFile = {path: actualPortrait, size: {width: 600, height: 1200}};

            render(
                <ThemeProvider theme='light'>
                    <TwoUpInteractiveModePure
                        expected={expected}
                        actual={actual}
                        is2UpDiffVisible={false}
                        globalTwoUpFitMode={TwoUpFitMode.FitToView}
                    />
                </ThemeProvider>
            );

            await browser.setWindowSize(800, 600);

            const container = await browser.$('[data-testid="two-up-interactive-mode"]');
            await waitForFonts(browser);
            await container.assertView('portrait-fit-to-view-reduced');
        });
    });

    describe('Small Images', () => {
        it('fit to width at default window size', async ({browser}) => {
            const expected: ImageFile = {path: expectedButton, size: {width: 120, height: 40}};
            const actual: ImageFile = {path: actualButton, size: {width: 120, height: 40}};

            render(
                <ThemeProvider theme='light'>
                    <TwoUpInteractiveModePure
                        expected={expected}
                        actual={actual}
                        is2UpDiffVisible={false}
                        globalTwoUpFitMode={TwoUpFitMode.FitToWidth}
                    />
                </ThemeProvider>
            );

            const container = await browser.$('[data-testid="two-up-interactive-mode"]');
            await waitForFonts(browser);
            await container.assertView('small-fit-to-width-default');
        });

        it('fit to width at reduced window size', async ({browser}) => {
            const expected: ImageFile = {path: expectedButton, size: {width: 120, height: 40}};
            const actual: ImageFile = {path: actualButton, size: {width: 120, height: 40}};

            render(
                <ThemeProvider theme='light'>
                    <TwoUpInteractiveModePure
                        expected={expected}
                        actual={actual}
                        is2UpDiffVisible={false}
                        globalTwoUpFitMode={TwoUpFitMode.FitToWidth}
                    />
                </ThemeProvider>
            );

            await browser.setWindowSize(800, 600);

            const container = await browser.$('[data-testid="two-up-interactive-mode"]');
            await waitForFonts(browser);
            await container.assertView('small-fit-to-width-reduced');
        });

        it('fit to view at default window size', async ({browser}) => {
            const expected: ImageFile = {path: expectedButton, size: {width: 120, height: 40}};
            const actual: ImageFile = {path: actualButton, size: {width: 120, height: 40}};

            render(
                <ThemeProvider theme='light'>
                    <TwoUpInteractiveModePure
                        expected={expected}
                        actual={actual}
                        is2UpDiffVisible={false}
                        globalTwoUpFitMode={TwoUpFitMode.FitToView}
                    />
                </ThemeProvider>
            );

            const container = await browser.$('[data-testid="two-up-interactive-mode"]');
            await waitForFonts(browser);
            await container.assertView('small-fit-to-view-default');
        });

        it('fit to view at reduced window size', async ({browser}) => {
            const expected: ImageFile = {path: expectedButton, size: {width: 120, height: 40}};
            const actual: ImageFile = {path: actualButton, size: {width: 120, height: 40}};

            render(
                <ThemeProvider theme='light'>
                    <TwoUpInteractiveModePure
                        expected={expected}
                        actual={actual}
                        is2UpDiffVisible={false}
                        globalTwoUpFitMode={TwoUpFitMode.FitToView}
                    />
                </ThemeProvider>
            );

            await browser.setWindowSize(800, 600);

            const container = await browser.$('[data-testid="two-up-interactive-mode"]');
            await waitForFonts(browser);
            await container.assertView('small-fit-to-view-reduced');
        });
    });

    describe('Mismatched Dimensions', () => {
        it('fit to width with portrait and landscape images at default window size', async ({browser}) => {
            const expected: ImageFile = {path: expectedWide, size: {width: 1000, height: 200}};
            const actual: ImageFile = {path: actualTall, size: {width: 200, height: 900}};

            render(
                <ThemeProvider theme='light'>
                    <TwoUpInteractiveModePure
                        expected={expected}
                        actual={actual}
                        is2UpDiffVisible={false}
                        globalTwoUpFitMode={TwoUpFitMode.FitToWidth}
                    />
                </ThemeProvider>
            );

            const container = await browser.$('[data-testid="two-up-interactive-mode"]');
            await waitForFonts(browser);
            await container.assertView('mismatched-fit-to-width-default');
        });

        it('fit to width with portrait and landscape images at reduced window size', async ({browser}) => {
            const expected: ImageFile = {path: expectedWide, size: {width: 1000, height: 200}};
            const actual: ImageFile = {path: actualTall, size: {width: 200, height: 900}};

            render(
                <ThemeProvider theme='light'>
                    <TwoUpInteractiveModePure
                        expected={expected}
                        actual={actual}
                        is2UpDiffVisible={false}
                        globalTwoUpFitMode={TwoUpFitMode.FitToWidth}
                    />
                </ThemeProvider>
            );

            await browser.setWindowSize(800, 600);

            const container = await browser.$('[data-testid="two-up-interactive-mode"]');
            await waitForFonts(browser);
            await container.assertView('mismatched-fit-to-width-reduced');
        });

        it('fit to view with portrait and landscape images at default window size', async ({browser}) => {
            const expected: ImageFile = {path: expectedWide, size: {width: 1000, height: 200}};
            const actual: ImageFile = {path: actualTall, size: {width: 200, height: 900}};

            render(
                <ThemeProvider theme='light'>
                    <TwoUpInteractiveModePure
                        expected={expected}
                        actual={actual}
                        is2UpDiffVisible={false}
                        globalTwoUpFitMode={TwoUpFitMode.FitToView}
                    />
                </ThemeProvider>
            );

            const container = await browser.$('[data-testid="two-up-interactive-mode"]');
            await waitForFonts(browser);
            await container.assertView('mismatched-fit-to-view-default');
        });

        it('fit to view with portrait and landscape images at reduced window size', async ({browser}) => {
            const expected: ImageFile = {path: expectedWide, size: {width: 1000, height: 200}};
            const actual: ImageFile = {path: actualTall, size: {width: 200, height: 900}};

            render(
                <ThemeProvider theme='light'>
                    <TwoUpInteractiveModePure
                        expected={expected}
                        actual={actual}
                        is2UpDiffVisible={false}
                        globalTwoUpFitMode={TwoUpFitMode.FitToView}
                    />
                </ThemeProvider>
            );

            await browser.setWindowSize(800, 600);

            const container = await browser.$('[data-testid="two-up-interactive-mode"]');
            await waitForFonts(browser);
            await container.assertView('mismatched-fit-to-view-reduced');
        });
    });

    it('switching fit modes resets zoom and pan', async ({browser}) => {
        const expected: ImageFile = {path: expectedDetailed, size: {width: 800, height: 600}};
        const actual: ImageFile = {path: actualDetailed, size: {width: 800, height: 600}};

        render(
            <ThemeProvider theme='light'>
                <TwoUpInteractiveModePure
                    expected={expected}
                    actual={actual}
                    is2UpDiffVisible={false}
                    globalTwoUpFitMode={TwoUpFitMode.FitToView}
                />
            </ThemeProvider>
        );

        const zoomInButton = await browser.$('[title="Zoom in"]');
        await zoomInButton.click();
        await zoomInButton.click();

        const imageContainer = await browser.$('[data-testid="image-panel-expected"]');
        await imageContainer.dragAndDrop({x: -100, y: -50});

        const fitToWidthButton = await browser.$('[title="Fit to width"]');
        await fitToWidthButton.click();

        const container = await browser.$('[data-testid="two-up-interactive-mode"]');
        await waitForFonts(browser);
        await container.assertView('fit-mode-reset');
    });
});
