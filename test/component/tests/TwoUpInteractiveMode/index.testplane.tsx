import React from 'react';
import {render} from '@testing-library/react';
import {TwoUpInteractiveModePure} from '../../../../lib/static/new-ui/components/DiffViewer/TwoUpInteractiveMode';
import {TwoUpFitMode} from '../../../../lib/constants';
import type {ImageFile} from '../../../../lib/types';

// Import CSS styles for component testing
import '../../styles.css';

// Import test images
import expectedImage from './images/black-square-on-green/expected.png';
import actualImage from './images/black-square-on-green/actual.png';
import diffImage from './images/black-square-on-green/diff.png';
import { ThemeProvider } from '@gravity-ui/uikit';

describe('TwoUpInteractiveMode Component', () => {
    const mockExpectedImage: ImageFile = {
        path: expectedImage,
        size: {
            width: 1000,
            height: 200
        }
    };

    const mockActualImage: ImageFile = {
        path: actualImage,
        size: {
            width: 200,
            height: 900
        }
    };

    const mockDiffImage: ImageFile = {
        path: diffImage,
        size: {
            width: 1000,
            height: 900
        }
    };

    it('should render both expected and actual images', async ({browser}) => {
        console.log('Current URL before render:', await browser.getUrl());
        render(
            <TwoUpInteractiveModePure
                expected={mockExpectedImage}
                actual={mockActualImage}
                is2UpDiffVisible={false}
                globalTwoUpFitMode={TwoUpFitMode.FitToView}
            />
        );

        const expectedLabel = await browser.$('*=Expected');
        const actualLabel = await browser.$('*=Actual');

        await expect(expectedLabel).toExist();
        await expect(actualLabel).toExist();

        const images = await browser.$$('img');
        await expect(images).toHaveLength(2);
    });

    it('should show diff overlay when is2UpDiffVisible is true', async ({browser}) => {
        render(
            <ThemeProvider theme='light'>
                <TwoUpInteractiveModePure
                    expected={mockExpectedImage}
                    actual={mockActualImage}
                    diff={mockDiffImage}
                    is2UpDiffVisible={true}
                    globalTwoUpFitMode={TwoUpFitMode.FitToView}
                    differentPixels={42}
                    diffRatio={0.15}
                />
            </ThemeProvider>
        );

        // Add a pause to inspect the component in DevTools
        await browser.pause(360000); // 6 minute pause

        const images = await browser.$$('img');
        await expect(images).toHaveLength(3);

        const actualLabel = await browser.$('*=Actual');
        const labelText = await actualLabel.getText();

        await expect(labelText).toContain('42');
        await expect(labelText).toContain('different');
    });

    it('should handle zoom in action', async ({browser}) => {
        render(
            <TwoUpInteractiveModePure
                expected={mockExpectedImage}
                actual={mockActualImage}
                is2UpDiffVisible={false}
                globalTwoUpFitMode={TwoUpFitMode.FitToWidth}
            />
        );

        const zoomInButton = await browser.$('[title="Zoom in"]');
        await expect(zoomInButton).toExist();

        await zoomInButton.click();

        // Verify that clicking zoom in doesn't crash the component
        const images = await browser.$$('img');
        await expect(images).toHaveLength(2);
    });

    it('should handle panning with mouse drag', async ({browser}) => {
        render(
            <TwoUpInteractiveModePure
                expected={mockExpectedImage}
                actual={mockActualImage}
                is2UpDiffVisible={false}
                globalTwoUpFitMode={TwoUpFitMode.FitToView}
            />
        );

        const container = await browser.$('img');
        const parentContainer = await container.parentElement();

        // Simulate drag action
        await browser.performActions([
            {
                type: 'pointer',
                id: 'mouse',
                parameters: {pointerType: 'mouse'},
                actions: [
                    {type: 'pointerMove', x: 50, y: 50, origin: parentContainer},
                    {type: 'pointerDown', button: 0},
                    {type: 'pointerMove', x: 100, y: 100, origin: parentContainer},
                    {type: 'pointerUp', button: 0}
                ]
            }
        ]);

        // Verify component still renders after interaction
        const images = await browser.$$('img');
        await expect(images).toHaveLength(2);
    });

    it('should switch between fit modes', async ({browser}) => {
        render(
            <TwoUpInteractiveModePure
                expected={mockExpectedImage}
                actual={mockActualImage}
                is2UpDiffVisible={false}
                globalTwoUpFitMode={TwoUpFitMode.FitToView}
            />
        );

        const fitToWidthButton = await browser.$('[title="Fit to width"]');
        const fitToViewButton = await browser.$('[title="Fit to view"]');

        await expect(fitToWidthButton).toExist();
        await expect(fitToViewButton).toExist();

        await fitToWidthButton.click();

        // Verify component still renders after mode switch
        const images = await browser.$$('img');
        await expect(images).toHaveLength(2);
    });
});
