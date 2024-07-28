import React from 'react';
import proxyquire from 'proxyquire';
import {defaults} from 'lodash';
import {mkState, mkConnectedComponent} from '../utils';
import userEvent from '@testing-library/user-event';

describe('<FindSameDiffsButton />', () => {
    const sandbox = sinon.sandbox.create();

    let FindSameDiffsButton;
    let actionsStub;
    let selectors;

    const mkFindSameDiffsButton = (props = {}, initialState = {}) => {
        props = defaults(props, {
            imageId: 'default-img-id',
            browserId: 'default-browser-id',
            isDisabled: false
        });

        initialState = defaults(initialState, {
            tree: {
                browsers: {
                    byId: {
                        'default-browser-id': {
                            name: 'yabro'
                        }
                    }
                }
            }
        });

        return mkConnectedComponent(<FindSameDiffsButton {...props} />, {initialState});
    };

    beforeEach(() => {
        actionsStub = {findSameDiffs: sandbox.stub().returns({type: 'some-type'})};
        selectors = {getFailedOpenedImageIds: sandbox.stub().returns([])};

        FindSameDiffsButton = proxyquire('lib/static/components/controls/find-same-diffs-button', {
            '../../modules/actions': actionsStub,
            '../../modules/selectors/tree': selectors
        }).default;
    });

    afterEach(() => sandbox.restore());

    it('should be disabled if passed prop "isDisabled" is true', () => {
        const component = mkFindSameDiffsButton({isDisabled: true});

        assert.isTrue(component.getByTestId('find-same-diffs').disabled);
    });

    it('should be enabled if passed prop "isDisabled" is false', () => {
        const component = mkFindSameDiffsButton({isDisabled: false});

        assert.isFalse(component.getByTestId('find-same-diffs').disabled);
    });

    it('should call "findSameDiffs" action on click', async () => {
        const user = userEvent.setup();
        const initialState = {
            tree: {
                browsers: {
                    byId: {
                        'browser-id': {
                            name: 'yabro'
                        }
                    }
                }
            }
        };
        const state = mkState({initialState});
        const failedOpenedImageIds = ['img-1', 'img-2'];
        selectors.getFailedOpenedImageIds.withArgs(state).returns(failedOpenedImageIds);

        const component = mkConnectedComponent(
            <FindSameDiffsButton imageId="img-1" browserId="browser-id" isDisabled={false} />,
            {state}
        );
        await user.click(component.getByTestId('find-same-diffs'));

        assert.calledOnceWith(actionsStub.findSameDiffs, 'img-1', failedOpenedImageIds, 'yabro');
    });
});
