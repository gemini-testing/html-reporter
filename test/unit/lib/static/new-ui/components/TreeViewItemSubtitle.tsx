import {expect} from 'chai';
import React, {createRef} from 'react';
import {MemoryRouter} from 'react-router-dom';

import {DiffModes, TestStatus} from '@/constants';
import {TreeViewItemSubtitle} from '@/static/new-ui/components/TreeViewItemSubtitle';
import {mkConnectedComponent, mkImageEntityFail, mkImageEntitySuccess, mkState, mkTreeNodeData} from '../../utils';

describe('<TreeViewItemSubtitle />', () => {
    const screenshot = {path: 'tiny.png', size: {width: 34, height: 34}};
    const images = [
        mkImageEntitySuccess('retry-switcher', {expectedImg: screenshot}),
        mkImageEntityFail('retry-switcher', {expectedImg: screenshot, actualImg: screenshot, diffImg: screenshot})
    ];

    for (const mode of [DiffModes.THREE_UP, DiffModes.SWITCH]) {
        for (const image of images) {
            it(`should not constrain the ${image.status} screenshot caption to the image width in ${mode.title} mode`, () => {
                const state = mkState({initialState: {}});
                state.view.diffMode = mode.id;
                state.tree.images.byId[image.id] = image;
                const item = mkTreeNodeData('browser', {status: image.status, images: [image]});
                const {getByText, getAllByRole} = mkConnectedComponent(
                    <MemoryRouter>
                        <TreeViewItemSubtitle item={item} isSelected={false} scrollContainerRef={createRef()}/>
                    </MemoryRouter>,
                    {initialState: state}
                );

                expect(getByText(/retry-switcher ⋅/).closest('[style*="max-width"]')).to.be.null;
                if (image.status === TestStatus.FAIL) {
                    const [preview] = getAllByRole('img', {name: 'Screenshot'});
                    expect(preview.closest('[style*="max-width: 34px"]')).to.exist;
                }
            });
        }
    }
});
