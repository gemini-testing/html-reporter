import React from 'react';
import {render} from '@testing-library/react';
import {TwoUpInteractiveModePure} from '../../../../lib/static/new-ui/components/DiffViewer/TwoUpInteractiveMode';
import {TwoUpFitMode} from '../../../../lib/constants';
import type {ImageFile} from '../../../../lib/types';
import {ThemeProvider} from '@gravity-ui/uikit';

import '../../styles.css';

import expectedStandard from './images/standard/expected.png';
import actualStandard from './images/standard/actual.png';
import diffStandard from './images/standard/diff.png';

import expectedWide from './images/mismatched/expected-wide.png';
import actualTall from './images/mismatched/actual-tall.png';
import diffMismatched from './images/mismatched/diff-mismatched.png';

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
            await container.assertView('same-dimensions');
        });
    });
});
