import axios from 'axios';
import proxyquire from 'proxyquire';
import {
    thunkAcceptImages,
    thunkRevertImages
} from 'lib/static/modules/actions';
import actionNames from 'lib/static/modules/action-names';

describe('lib/static/modules/actions', () => {
    const sandbox = sinon.sandbox.create();
    let dispatch, actions, pluginsStub;

    beforeEach(() => {
        dispatch = sandbox.stub();
        sandbox.stub(axios, 'post').resolves({data: {}});
        pluginsStub = {loadAll: sandbox.stub()};

        actions = proxyquire('lib/static/modules/actions', {
            '../plugins': pluginsStub
        });
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('thunkAcceptImages', () => {
        it('should update opened images', async () => {
            const imageIds = ['img-id-1', 'img-id-2'];
            const images = [{id: 'img-id-1'}, {id: 'img-id-2'}];
            axios.post.withArgs('/reference-data-to-update', imageIds).returns({data: images});

            await thunkAcceptImages({imageIds})(dispatch);

            assert.calledWith(axios.post.firstCall, '/reference-data-to-update', imageIds);
            assert.calledWith(axios.post.secondCall, '/update-reference', images);
        });
    });

    describe('thunkRevertImages', () => {
        it('should cancel update of accepted image', async () => {
            const imageIds = ['img-id-1', 'img-id-2'];
            const images = [{id: 'img-id-1'}, {id: 'img-id-2'}];
            axios.post.withArgs('/reference-data-to-update', imageIds).returns({data: images});

            await thunkRevertImages({imageIds})(dispatch);

            assert.calledWith(axios.post.firstCall, '/reference-data-to-update', imageIds);
            assert.calledWith(axios.post.secondCall, '/undo-accept-images', images);
            assert.calledWith(dispatch, {
                type: actionNames.COMMIT_REVERTED_IMAGES_TO_TREE,
                payload: {}
            });
        });
    });

    describe('openModal', () => {
        it('should open modal', () => {
            const modal = {id: 'modal-id'};

            assert.deepEqual(actions.openModal(modal), {type: actionNames.OPEN_MODAL, payload: modal});
        });
    });

    describe('closeModal', () => {
        it('should close modal', () => {
            const modal = {id: 'modal-id'};

            assert.deepEqual(actions.closeModal(modal), {type: actionNames.CLOSE_MODAL, payload: modal});
        });
    });
});
