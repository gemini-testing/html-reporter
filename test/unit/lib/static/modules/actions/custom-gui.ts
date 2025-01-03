import * as customGuiActions from '@/static/modules/actions/custom-gui';
import axiosOriginal from 'axios';
import actionNames from '@/static/modules/action-names';
import sinon, {SinonStub, SinonStubbedInstance} from 'sinon';
import proxyquire from 'proxyquire';

const axios = axiosOriginal as unknown as SinonStubbedInstance<typeof axiosOriginal>;

describe('lib/static/modules/actions/custom-gui', () => {
    const sandbox = sinon.sandbox.create();
    let dispatch: SinonStub;
    let createNotificationError: SinonStub;
    let actions: typeof customGuiActions;

    beforeEach(() => {
        dispatch = sinon.stub();
        createNotificationError = sinon.stub();

        sandbox.stub(axios, 'post').resolves({data: {}});

        actions = proxyquire('lib/static/modules/actions/custom-gui', {
            '@/static/modules/actions/notifications': {createNotificationError}
        });
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('thunkRunCustomGuiAction', () => {
        it('should run custom action on server for control of given group of section', async () => {
            const payload = {
                sectionName: 'foo',
                groupIndex: 100,
                controlIndex: 500
            };

            await actions.thunkRunCustomGuiAction(payload)(dispatch, sinon.stub(), null);

            assert.calledOnceWith(
                axios.post,
                sinon.match.any,
                sinon.match(({sectionName, groupIndex, controlIndex}: {sectionName: string; groupIndex: number; controlIndex: number}) => {
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

            await actions.thunkRunCustomGuiAction(payload)(dispatch, sinon.stub(), null);

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
            const customGuiError = new Error('failed to run custom gui control action');
            axios.post.throws(customGuiError);

            await actions.thunkRunCustomGuiAction(payload)(dispatch, sinon.stub(), null);

            assert.calledOnceWith(
                createNotificationError,
                'runCustomGuiAction',
                customGuiError
            );
        });
    });
});
