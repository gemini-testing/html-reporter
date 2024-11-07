import _ from 'lodash';
import reducer from 'lib/static/modules/reducers/static-image-accepter';
import actionNames from 'lib/static/modules/action-names';
import {COMMITED, STAGED} from 'lib/constants';
import {mkBrowser, mkResult, mkImage, mkStateTree, type TreeImage} from '../../state-utils';
import type defaultState from 'lib/static/modules/default-state';

interface StaticAccepterAcceptableImage extends Pick<TreeImage, 'id' | 'parentId' | 'stateName'> {
    commitStatus: typeof STAGED | typeof COMMITED | null,
    originalStatus: TreeImage['status'],
    stateNameImageId: string
}

const mkStaticImageAccepter = ({
    acceptableImages = {},
    accepterDelayedImages = [],
    imagesToCommitCount = 0
}: {
    acceptableImages?: Record<string, StaticAccepterAcceptableImage>,
    accepterDelayedImages?: {imageId: string, stateName: string, stateNameImageId: string}[],
    imagesToCommitCount?: number
} = {}): typeof defaultState['staticImageAccepter'] => {
    return {
        enabled: true,
        acceptableImages,
        accepterDelayedImages,
        imagesToCommitCount
    };
};

const mkAcceptableImage = (image?: Partial<StaticAccepterAcceptableImage>): StaticAccepterAcceptableImage => {
    return _.defaults(image || {}, {
        id: 'id',
        parentId: 'parentId',
        stateName: 'stateName',
        commitStatus: null,
        originalStatus: 'fail',
        stateNameImageId: 'stateNameImageId'
    });
};

describe('lib/static/modules/reducers/static-image-accepter', () => {
    it(`${actionNames.STATIC_ACCEPTER_DELAY_SCREENSHOT} should add screenshot to delayed`, () => {
        const state = {staticImageAccepter: {accepterDelayedImages: ['foo']}};

        const newState = reducer(state, {type: actionNames.STATIC_ACCEPTER_DELAY_SCREENSHOT, payload: 'bar'});

        assert.deepEqual(newState.staticImageAccepter.accepterDelayedImages, ['foo', 'bar']);
    });

    it(`${actionNames.STATIC_ACCEPTER_UNDO_DELAY_SCREENSHOT} should pop screenshot out of delayed`, () => {
        const state = {staticImageAccepter: {accepterDelayedImages: ['foo', 'bar']}};

        const newState = reducer(state, {type: actionNames.STATIC_ACCEPTER_UNDO_DELAY_SCREENSHOT});

        assert.deepEqual(newState.staticImageAccepter.accepterDelayedImages, ['foo']);
    });

    describe(actionNames.STATIC_ACCEPTER_STAGE_SCREENSHOT, () => {
        it('should stage image, incrementing "imagesToCommitCount"', () => {
            const staticImageAccepter = mkStaticImageAccepter({acceptableImages: {
                'imageId': mkAcceptableImage({id: 'imageId'})
            }});

            const imagesById = mkImage({id: 'imageId', stateName: 'state', parentId: 'resultId'});
            const resultsById = mkResult({id: 'resultId', imageIds: ['imageId'], parentId: 'browserId'});
            const browsersById = mkBrowser({id: 'browserId', resultIds: ['resultId']});
            const tree = mkStateTree({imagesById, resultsById, browsersById});

            const state = {staticImageAccepter, tree};

            const newState = reducer(state, {type: actionNames.STATIC_ACCEPTER_STAGE_SCREENSHOT, payload: ['imageId']});

            assert.equal(newState.staticImageAccepter.acceptableImages['imageId'].commitStatus, STAGED);

            assert.equal(newState.staticImageAccepter.imagesToCommitCount, state.staticImageAccepter.imagesToCommitCount + 1);
        });

        it('should unstage other image with same stateNameImageId, not changing "imagesToCommitCount"', () => {
            const staticImageAccepter = mkStaticImageAccepter({acceptableImages: {
                'imageId1': mkAcceptableImage({id: 'imageId1', stateNameImageId: 'foo', commitStatus: null}),
                'imageId2': mkAcceptableImage({id: 'imageId2', stateNameImageId: 'foo', commitStatus: STAGED}),
                'imageId3': mkAcceptableImage({id: 'imageId3', stateNameImageId: 'bar', commitStatus: STAGED})
            }});

            const imagesById = {
                ...mkImage({id: 'imageId1', stateName: 'state', parentId: 'resultId1'}),
                ...mkImage({id: 'imageId2', stateName: 'state', parentId: 'resultId1'}),
                ...mkImage({id: 'imageId3', stateName: 'state', parentId: 'resultId2'})
            };
            const resultsById = {
                ...mkResult({id: 'resultId1', imageIds: ['imageId1', 'imageId2'], parentId: 'browserId'}),
                ...mkResult({id: 'resultId2', imageIds: ['imageId3'], parentId: 'browserId'})
            };
            const browsersById = mkBrowser({id: 'browserId', resultIds: ['resultId1', 'resultId2']});
            const tree = mkStateTree({imagesById, resultsById, browsersById});

            const state = {staticImageAccepter, tree};

            const newState = reducer(state, {type: actionNames.STATIC_ACCEPTER_STAGE_SCREENSHOT, payload: ['imageId1']});

            assert.equal(newState.staticImageAccepter.acceptableImages['imageId1'].commitStatus, STAGED);
            assert.equal(newState.staticImageAccepter.acceptableImages['imageId2'].commitStatus, null);
            assert.equal(newState.staticImageAccepter.acceptableImages['imageId3'].commitStatus, STAGED);

            assert.equal(newState.staticImageAccepter.imagesToCommitCount, state.staticImageAccepter.imagesToCommitCount);
        });

        it('should increment "imagesToCommitCount" if other image with same stateNameImageId is commited', () => {
            const staticImageAccepter = mkStaticImageAccepter({acceptableImages: {
                'imageId1': mkAcceptableImage({id: 'imageId1', stateNameImageId: 'foo', commitStatus: null}),
                'imageId2': mkAcceptableImage({id: 'imageId2', stateNameImageId: 'foo', commitStatus: COMMITED})
            }});

            const imagesById = {
                ...mkImage({id: 'imageId1', stateName: 'state', parentId: 'resultId1'}),
                ...mkImage({id: 'imageId2', stateName: 'state', parentId: 'resultId1'})
            };
            const resultsById = mkResult({id: 'resultId1', imageIds: ['imageId1', 'imageId2'], parentId: 'browserId'});
            const browsersById = mkBrowser({id: 'browserId', resultIds: ['resultId1']});
            const tree = mkStateTree({imagesById, resultsById, browsersById});

            const state = {staticImageAccepter, tree};

            const newState = reducer(state, {type: actionNames.STATIC_ACCEPTER_STAGE_SCREENSHOT, payload: ['imageId1']});

            assert.equal(newState.staticImageAccepter.imagesToCommitCount, state.staticImageAccepter.imagesToCommitCount + 1);
        });

        it('should clear accepterDelayedImages', () => {
            const staticImageAccepter = mkStaticImageAccepter({accepterDelayedImages: [{imageId: 'imageId', stateName: 'stateName', stateNameImageId: 'stateNameImageId'}]});

            const imagesById = mkImage({id: 'imageId', stateName: 'state', parentId: 'resultId'});
            const resultsById = mkResult({id: 'resultId', imageIds: ['imageId'], parentId: 'browserId'});
            const browsersById = mkBrowser({id: 'browserId', resultIds: ['resultId']});
            const tree = mkStateTree({imagesById, resultsById, browsersById});

            const state = {staticImageAccepter, tree};

            const newState = reducer(state, {type: actionNames.STATIC_ACCEPTER_STAGE_SCREENSHOT, payload: []});

            assert.deepEqual(newState.staticImageAccepter.accepterDelayedImages, []);
        });
    });

    describe(actionNames.STATIC_ACCEPTER_UNSTAGE_SCREENSHOT, () => {
        it('should unstage image, decrementing "imagesToCommitCount"', () => {
            const staticImageAccepter = mkStaticImageAccepter({acceptableImages: {
                'imageId': mkAcceptableImage({id: 'imageId'})
            }});

            const imagesById = mkImage({id: 'imageId', stateName: 'state', parentId: 'resultId'});
            const resultsById = mkResult({id: 'resultId', imageIds: ['imageId'], parentId: 'browserId'});
            const browsersById = mkBrowser({id: 'browserId', resultIds: ['resultId']});
            const tree = mkStateTree({imagesById, resultsById, browsersById});

            const state = {staticImageAccepter, tree};

            const newState = reducer(state, {type: actionNames.STATIC_ACCEPTER_UNSTAGE_SCREENSHOT, payload: ['imageId']});

            assert.equal(newState.staticImageAccepter.acceptableImages['imageId'].commitStatus, null);

            assert.equal(newState.staticImageAccepter.imagesToCommitCount, state.staticImageAccepter.imagesToCommitCount - 1);
        });
    });

    describe(actionNames.STATIC_ACCEPTER_COMMIT_SCREENSHOT, () => {
        it('should commit image, clearing "imagesToCommitCount"', () => {
            const staticImageAccepter = mkStaticImageAccepter({
                imagesToCommitCount: 100500,
                acceptableImages: {
                    'imageId': mkAcceptableImage({id: 'imageId', commitStatus: STAGED})
                }
            });

            const imagesById = mkImage({id: 'imageId', stateName: 'state', parentId: 'resultId'});
            const resultsById = mkResult({id: 'resultId', imageIds: ['imageId'], parentId: 'browserId'});
            const browsersById = mkBrowser({id: 'browserId', resultIds: ['resultId']});
            const tree = mkStateTree({imagesById, resultsById, browsersById});

            const state = {staticImageAccepter, tree};

            const newState = reducer(state, {type: actionNames.STATIC_ACCEPTER_COMMIT_SCREENSHOT, payload: ['imageId']});

            assert.equal(newState.staticImageAccepter.acceptableImages['imageId'].commitStatus, COMMITED);

            assert.equal(newState.staticImageAccepter.imagesToCommitCount, 0);
        });

        it('should commit image if it was not staged', () => {
            const staticImageAccepter = mkStaticImageAccepter({
                acceptableImages: {
                    'imageId': mkAcceptableImage({id: 'imageId'})
                }
            });

            const imagesById = mkImage({id: 'imageId', stateName: 'state', parentId: 'resultId'});
            const resultsById = mkResult({id: 'resultId', imageIds: ['imageId'], parentId: 'browserId'});
            const browsersById = mkBrowser({id: 'browserId', resultIds: ['resultId']});
            const tree = mkStateTree({imagesById, resultsById, browsersById});

            const state = {staticImageAccepter, tree};

            const newState = reducer(state, {type: actionNames.STATIC_ACCEPTER_COMMIT_SCREENSHOT, payload: ['imageId']});

            assert.equal(newState.staticImageAccepter.acceptableImages['imageId'].commitStatus, COMMITED);
        });
    });
});
