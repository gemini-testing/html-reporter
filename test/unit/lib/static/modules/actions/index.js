import axios from 'axios';
import proxyquire from 'proxyquire';
import {POSITIONS} from 'reapop';
import {acceptOpened, undoAcceptImages, retryTest, runFailedTests} from 'lib/static/modules/actions';
import actionNames from 'lib/static/modules/action-names';
import {DiffModes} from 'lib/constants/diff-modes';

describe('lib/static/modules/actions', () => {
    const sandbox = sinon.sandbox.create();
    let dispatch, actions, notify, getSuitesTableRows, getMainDatabaseUrl, connectToDatabaseStub, pluginsStub;

    beforeEach(() => {
        dispatch = sandbox.stub();
        sandbox.stub(axios, 'post').resolves({data: {}});
        notify = sandbox.stub();
        getSuitesTableRows = sandbox.stub();
        getMainDatabaseUrl = sandbox.stub().returns({href: 'http://localhost/default/sqlite.db'});
        connectToDatabaseStub = sandbox.stub().resolves({});
        pluginsStub = {loadAll: sandbox.stub()};

        actions = proxyquire('lib/static/modules/actions', {
            'reapop': {notify},
            '../database-utils': {getSuitesTableRows},
            '../../../db-utils/client': {getMainDatabaseUrl, connectToDatabase: connectToDatabaseStub},
            '../plugins': pluginsStub
        });
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('acceptOpened', () => {
        it('should update opened images', async () => {
            const imageIds = ['img-id-1', 'img-id-2'];
            const images = [{id: 'img-id-1'}, {id: 'img-id-2'}];
            axios.post.withArgs('/reference-data-to-update', imageIds).returns({data: images});

            await acceptOpened(imageIds)(dispatch);

            assert.calledWith(axios.post.firstCall, '/reference-data-to-update', imageIds);
            assert.calledWith(axios.post.secondCall, '/update-reference', images);
        });
    });

    describe('undoAcceptImages', () => {
        it('should cancel update of accepted image', async () => {
            const imageIds = ['img-id-1', 'img-id-2'];
            const images = [{id: 'img-id-1'}, {id: 'img-id-2'}];
            axios.post.withArgs('/reference-data-to-update', imageIds).returns({data: images});

            await undoAcceptImages(imageIds)(dispatch);

            assert.calledWith(axios.post.firstCall, '/reference-data-to-update', imageIds);
            assert.calledWith(axios.post.secondCall, '/undo-accept-images', images);
            assert.calledWith(dispatch, {
                type: actionNames.UNDO_ACCEPT_IMAGES,
                payload: {skipTreeUpdate: false}
            });
        });

        it('should skip tree update, if specified', async () => {
            const imageIds = ['img-id-1', 'img-id-2'];
            const data = {foo: 'bar'};
            axios.post.withArgs('/undo-accept-images', imageIds).returns({data});

            await undoAcceptImages(imageIds, {skipTreeUpdate: true})(dispatch);

            assert.calledWith(dispatch, {
                type: actionNames.UNDO_ACCEPT_IMAGES,
                payload: {skipTreeUpdate: true}
            });
        });
    });

    describe('retryTest', () => {
        it('should retry passed test', async () => {
            const test = {testName: 'test-name', browserName: 'yabro'};

            await retryTest(test)(dispatch);

            assert.calledOnceWith(axios.post, '/run', [test]);
            assert.calledOnceWith(dispatch, {type: actionNames.RETRY_TEST});
        });
    });

    describe('runFailedTests', () => {
        it('should run all failed tests', async () => {
            const failedTests = [
                {testName: 'test-name-1', browserName: 'yabro'},
                {testName: 'test-name-2', browserName: 'yabro'}
            ];

            await runFailedTests(failedTests)(dispatch);

            assert.calledOnceWith(axios.post, '/run', failedTests);
            assert.calledOnceWith(dispatch, {type: actionNames.RUN_FAILED_TESTS});
        });
    });

    describe('runCustomGuiAction', () => {
        it('should run custom action on server for control of given group of section', async () => {
            const payload = {
                sectionName: 'foo',
                groupIndex: 100,
                controlIndex: 500
            };

            await actions.runCustomGuiAction(payload)(dispatch);

            assert.calledOnceWith(
                axios.post,
                sinon.match.any,
                sinon.match(({sectionName, groupIndex, controlIndex}) => {
                    assert.equal(sectionName, 'foo');
                    assert.equal(groupIndex, 100);
                    assert.equal(controlIndex, 500);
                    return true;
                })
            );
        });

        it('should dispatch action for control of given group of section', async () => {
            const payload = {
                sectionName: 'foo',
                groupIndex: 100,
                controlIndex: 500
            };

            await actions.runCustomGuiAction(payload)(dispatch);

            assert.calledOnceWith(
                dispatch,
                {
                    type: actionNames.RUN_CUSTOM_GUI_ACTION,
                    payload: {
                        sectionName: 'foo',
                        groupIndex: 100,
                        controlIndex: 500
                    }
                }
            );
        });

        it('should show notification if error in action on the server is happened', async () => {
            const payload = {
                sectionName: 'foo',
                groupIndex: 100,
                controlIndex: 500
            };
            axios.post.throws(new Error('failed to run custom gui control action'));

            await actions.runCustomGuiAction(payload)(dispatch);

            assert.calledOnceWith(
                notify,
                {
                    dismissAfter: 0,
                    id: 'runCustomGuiAction',
                    message: 'failed to run custom gui control action',
                    status: 'error',
                    position: POSITIONS.topCenter,
                    dismissible: true,
                    showDismissButton: true,
                    allowHTML: true
                }
            );
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

    describe('testsEnd', () => {
        it('should connect to database', async () => {
            const href = 'http://127.0.0.1:8080/sqlite.db';
            getMainDatabaseUrl.returns({href});

            await actions.testsEnd()(dispatch);

            assert.calledOnceWith(connectToDatabaseStub, href);
        });

        it('should dispatch "TESTS_END" action with db connection', async () => {
            const db = {};
            connectToDatabaseStub.resolves(db);

            await actions.testsEnd()(dispatch);

            assert.calledOnceWith(dispatch, {
                type: actionNames.TESTS_END,
                payload: {db}
            });
        });

        it('should show notification if error appears', async () => {
            connectToDatabaseStub.rejects(new Error('failed to connect to database'));

            await actions.testsEnd()(dispatch);

            assert.calledOnceWith(
                notify,
                {
                    dismissAfter: 0,
                    id: 'testsEnd',
                    message: 'failed to connect to database',
                    status: 'error',
                    position: POSITIONS.topCenter,
                    dismissible: true,
                    showDismissButton: true,
                    allowHTML: true
                }
            );
        });
    });

    describe('changeDiffMode', () => {
        [
            {mode: DiffModes.THREE_UP.id, actionType: actionNames.VIEW_THREE_UP_DIFF},
            {mode: DiffModes.THREE_UP_SCALED.id, actionType: actionNames.VIEW_THREE_UP_SCALED_DIFF},
            {mode: DiffModes.THREE_UP_SCALED_TO_FIT.id, actionType: actionNames.VIEW_THREE_UP_SCALED_TO_FIT_DIFF},
            {mode: DiffModes.ONLY_DIFF.id, actionType: actionNames.VIEW_ONLY_DIFF},
            {mode: DiffModes.SWITCH.id, actionType: actionNames.VIEW_SWITCH_DIFF},
            {mode: DiffModes.SWIPE.id, actionType: actionNames.VIEW_SWIPE_DIFF},
            {mode: DiffModes.ONION_SKIN.id, actionType: actionNames.VIEW_ONION_SKIN_DIFF},
            {mode: 'UNKNOWN_MODE', actionType: actionNames.VIEW_THREE_UP_DIFF}
        ].forEach(({mode, actionType}) => {
            it(`should dispatch "${actionType}" action`, () => {
                assert.deepEqual(
                    actions.changeDiffMode(mode),
                    {type: actionType}
                );
            });
        });
    });
});
