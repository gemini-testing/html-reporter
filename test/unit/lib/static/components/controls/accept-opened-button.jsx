import React from 'react';
import proxyquire from 'proxyquire';
import {mkState, mkConnectedComponent} from '../../utils';
import userEvent from '@testing-library/user-event';

describe('<AcceptOpenedButton />', () => {
    const sandbox = sinon.sandbox.create();

    let AcceptOpenedButton;
    let actionsStub;
    let selectors;

    beforeEach(() => {
        actionsStub = {thunkAcceptImages: sandbox.stub().returns({type: 'some-type'})};
        selectors = {getAcceptableOpenedImageIds: sandbox.stub().returns([])};

        AcceptOpenedButton = proxyquire('lib/static/components/controls/accept-opened-button', {
            '../../modules/actions': actionsStub,
            '../../modules/selectors/tree': selectors
        }).default;
    });

    afterEach(() => sandbox.restore());

    it('should be disabled if acceptable opened images are not present', () => {
        const state = mkState({initialState: {processing: false}});
        const acceptableOpenedImageIds = [];
        selectors.getAcceptableOpenedImageIds.withArgs(state).returns(acceptableOpenedImageIds);

        const component = mkConnectedComponent(<AcceptOpenedButton />, state);

        assert.isTrue(component.getByRole('button').disabled);
    });

    it('should be disabled while processing something', () => {
        const state = mkState({initialState: {processing: true}});
        const acceptableOpenedImageIds = ['img-id-1'];
        selectors.getAcceptableOpenedImageIds.withArgs(state).returns(acceptableOpenedImageIds);

        const component = mkConnectedComponent(<AcceptOpenedButton />, state);

        assert.isTrue(component.getByRole('button').disabled);
    });

    it('should be enabled if acceptable opened images are present', () => {
        const state = mkState({initialState: {processing: false}});
        const acceptableOpenedImageIds = ['img-id-1'];
        selectors.getAcceptableOpenedImageIds.withArgs(state).returns(acceptableOpenedImageIds);

        const component = mkConnectedComponent(<AcceptOpenedButton />, state);

        assert.isFalse(component.getByRole('button').disabled);
    });

    it('should call "thunkAcceptImages" action on click', async () => {
        const user = userEvent.setup();
        const state = mkState({initialState: {processing: false}});
        const acceptableOpenedImageIds = ['img-id-1'];
        selectors.getAcceptableOpenedImageIds.withArgs(state).returns(acceptableOpenedImageIds);

        const component = mkConnectedComponent(<AcceptOpenedButton />, state);
        await user.click(component.getByRole('button'));

        assert.calledOnceWith(actionsStub.thunkAcceptImages, {imageIds: acceptableOpenedImageIds});
    });
});
