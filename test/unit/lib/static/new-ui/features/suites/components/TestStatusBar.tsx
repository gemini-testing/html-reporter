import {act} from '@testing-library/react';
import {expect} from 'chai';
import React from 'react';

import {setCurrentTreeNode} from '@/static/modules/actions/suites-page';
import {TestStatusBar} from '@/static/new-ui/features/suites/components/TestStatusBar';
import {AttachmentType} from '@/types';
import {
    addBrowserToTree,
    addResultToTree,
    mkBrowserEntity,
    mkEmptyTree,
    mkRealStore,
    mkResultEntity,
    mkState,
    renderWithStore
} from '../../../../utils';

describe('<TestStatusBar />', () => {
    it('should update and remove badges when switching between results with unchanged page URLs', () => {
        const tree = mkEmptyTree();

        for (const [id, url] of [['a', 'https://example.com/a'], ['b', 'https://example.com/b'], ['empty', '']]) {
            const browser = mkBrowserEntity(id);
            addBrowserToTree({tree, browser});
            addResultToTree({
                tree,
                result: mkResultEntity(`result-${id}`, {
                    parentId: browser.id,
                    suiteUrl: '',
                    metaInfo: {},
                    attachments: url ? [{type: AttachmentType.Badges, list: [{title: 'External link', url}]}] : []
                })
            });
        }

        const initialState = mkState({initialState: {tree}});
        initialState.app.suitesPage.currentBrowserId = 'a';
        initialState.app.suitesPage.currentTreeNodeId = 'a';
        initialState.view.baseHost = '';

        const store = mkRealStore({initialState, middlewares: []});
        const component = renderWithStore(<TestStatusBar />, store);

        expect(component.getByRole('link', {name: 'External link'}).getAttribute('href')).to.equal('https://example.com/a');

        for (const id of ['b', 'a', 'empty']) {
            act(() => {
                store.dispatch(setCurrentTreeNode({browserId: id, treeNodeId: id}));
            });

            if (id === 'empty') {
                expect(component.queryByRole('link', {name: 'External link'})).to.not.exist;
            } else {
                expect(component.getByRole('link', {name: 'External link'}).getAttribute('href')).to.equal(`https://example.com/${id}`);
            }
        }
    });
});
