import {ThemeProvider} from '@gravity-ui/uikit';
import {render, type RenderResult} from '@testing-library/react';
import React, {createRef} from 'react';
import {Provider} from 'react-redux';
import {MemoryRouter} from 'react-router-dom';
import {createStore} from 'redux';

import {DiffModes, TestStatus, type DiffModeId} from '@/constants';
import defaultState from '@/static/modules/default-state';
import {TreeViewItemSubtitle} from '@/static/new-ui/components/TreeViewItemSubtitle';
import {EntityType} from '@/static/new-ui/features/suites/components/SuitesPage/types';
import type {ImageEntity} from '@/static/new-ui/types/store';
import expectedSmall from './images/expected.png';
import actualSmall from './images/actual.png';
import diffSmall from './images/diff.png';
import expectedLarge from '../TwoUpInteractiveMode/images/landscape/expected-landscape.png';
import actualLarge from '../TwoUpInteractiveMode/images/landscape/actual-landscape.png';
import diffLarge from '../TwoUpInteractiveMode/images/landscape/diff-landscape.png';
import '../../setup';

const fixtures = {
    small: {
        size: {width: 34, height: 34}, expected: expectedSmall, actual: actualSmall, diff: diffSmall,
        differentPixels: 944, diffClusters: [{left: 0, top: 0, right: 33, bottom: 33}]
    },
    large: {
        size: {width: 1600, height: 400}, expected: expectedLarge, actual: actualLarge, diff: diffLarge,
        differentPixels: 3200, diffClusters: [{left: 1160, top: 162, right: 1240, bottom: 240}]
    }
};

// The expanded tree has room for all three SbS columns.
const treePaneStyle = {width: 760, containerType: 'inline-size'} as const;

function renderTreeRow(image: ImageEntity, diffMode: DiffModeId): RenderResult {
    const store = createStore(() => ({
        ...defaultState,
        gui: false,
        view: {...defaultState.view, diffMode},
        tree: {...defaultState.tree, images: {...defaultState.tree.images, byId: {[image.id]: image}}}
    }));
    const item = {
        id: 'chrome', entityId: 'chrome', entityType: EntityType.Browser, title: ['chrome'],
        tags: [], status: image.status, images: [image]
    };
    const scrollRef = createRef<HTMLDivElement>();

    return render(
        <Provider store={store}>
            <MemoryRouter>
                <ThemeProvider theme="light">
                    <div ref={scrollRef} data-testid="tree-row" style={treePaneStyle}>
                        <TreeViewItemSubtitle item={item} scrollContainerRef={scrollRef} isSelected={false}/>
                    </div>
                </ThemeProvider>
            </MemoryRouter>
        </Provider>
    );
}

describe('TreeViewItemSubtitle', () => {
    for (const [name, {size, expected, actual, diff, differentPixels, diffClusters}] of Object.entries(fixtures)) {
        const expectedImg = {path: expected, size};
        const base = {id: 'image', parentId: 'result', stateName: 'retry-switcher', expectedImg, refImg: expectedImg};
        const images: ImageEntity[] = [
            {...base, status: TestStatus.SUCCESS},
            {
                ...base, status: TestStatus.FAIL, actualImg: {path: actual, size}, diffImg: {path: diff, size},
                diffClusters, differentPixels, diffRatio: differentPixels / (size.width * size.height)
            }
        ];
        for (const image of images) {
            for (const mode of [DiffModes.SWITCH, DiffModes.THREE_UP_SCALED]) {
                const outcome = image.status === TestStatus.SUCCESS ? 'match' : 'differ';
                it(`renders a ${name} screenshot in ${mode.title} mode when images ${outcome}`, async ({browser}) => {
                    const {container} = renderTreeRow(image, mode.id);
                    await Promise.all(Array.from(container.querySelectorAll('img'), img => img.decode()));
                    await document.fonts.ready;
                    const row = await browser.findByTestId('tree-row');
                    await row.assertView('screenshot');
                });
            }
        }
    }
});
