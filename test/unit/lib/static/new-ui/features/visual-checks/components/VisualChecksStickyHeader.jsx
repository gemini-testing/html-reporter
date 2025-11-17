import React from 'react';
import {addBrowserToTree, addImageToTree, addResultToTree, addSuiteToTree, mkBrowserEntity, mkEmptyTree, mkImageEntityFail, mkRealStore, mkResultEntity, mkSuiteEntityLeaf, renderWithStore} from '../../../../utils';
import proxyquire from 'proxyquire';
import {getNamedImages} from '@/static/new-ui/features/visual-checks/selectors';
import {BrowserRouter} from 'react-router-dom';

describe('<VisualChecksStickyHeader />', () => {
    const sandbox = sinon.sandbox.create();

    const prepareTestStore = () => {
        const tree = mkEmptyTree();

        const suite = mkSuiteEntityLeaf(`test-1`);
        addSuiteToTree({tree, suite});

        const browser = mkBrowserEntity(`bro-1`, {parentId: suite.id});
        addBrowserToTree({tree, browser});

        const result = mkResultEntity(`res-1`, {parentId: browser.id});
        addResultToTree({tree, result});

        for (const i of Array.from({length: 10}).map((_, i) => i + 1)) {
            const image = mkImageEntityFail(`img-${i}`, {parentId: result.id});
            addImageToTree({tree, image});
        }

        const store = mkRealStore({
            initialState: {
                app: {
                    isInitialized: true
                },
                tree
            }
        });

        return store;
    };

    let store;
    let preloadImageEntityStub;

    beforeEach(() => {
        preloadImageEntityStub = sandbox.stub();

        store = prepareTestStore();
        const visibleNamedImageIds = Object.values(getNamedImages(store.getState())).map(({id}) => id);

        const VisualChecksStickyHeader = proxyquire('lib/static/new-ui/features/visual-checks/components/VisualChecksPage/VisualChecksStickyHeader', {
            '../../../../../modules/utils/imageEntity': {preloadImageEntity: preloadImageEntityStub}
        }).VisualChecksStickyHeader;

        renderWithStore((
            <BrowserRouter>
                <VisualChecksStickyHeader treeData={{allTreeNodeIds: visibleNamedImageIds}} />
            </BrowserRouter>
        ), store);
    });

    afterEach(() => {
        sandbox.restore();
    });

    it('should preload current and 3 adjacent images on mount', async () => {
        const state = store.getState();
        const orderedImages = Object.values(state.tree.images.byId);

        for (let i = 0; i < 3; i++) {
            assert.calledWith(
                preloadImageEntityStub,
                orderedImages[i]
            );
        }
    });
});
