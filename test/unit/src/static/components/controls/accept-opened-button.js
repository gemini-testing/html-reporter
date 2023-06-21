import React from 'react';
import proxyquire from 'proxyquire';
import {mkState, mkConnectedComponent} from '../utils';

describe('<AcceptOpenedButton />', () => {
    const sandbox = sinon.sandbox.create();

    let AcceptOpenedButton;
    let actionsStub;
    let selectors;

    beforeEach(() => {
        actionsStub = {acceptOpened: sandbox.stub().returns({type: 'some-type'})};
        selectors = {getAcceptableOpenedImageIds: sandbox.stub().returns([])};

        AcceptOpenedButton = proxyquire('src/static/components/controls/accept-opened-button', {
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

        assert.isTrue(component.find('[label="Accept opened"]').prop('isDisabled'));
    });

    it('should be disabled while processing something', () => {
        const state = mkState({initialState: {processing: true}});
        const acceptableOpenedImageIds = ['img-id-1'];
        selectors.getAcceptableOpenedImageIds.withArgs(state).returns(acceptableOpenedImageIds);

        const component = mkConnectedComponent(<AcceptOpenedButton />, state);

        assert.isTrue(component.find('[label="Accept opened"]').prop('isDisabled'));
    });

    it('should be enabled if acceptable opened images are present', () => {
        const state = mkState({initialState: {processing: false}});
        const acceptableOpenedImageIds = ['img-id-1'];
        selectors.getAcceptableOpenedImageIds.withArgs(state).returns(acceptableOpenedImageIds);

        const component = mkConnectedComponent(<AcceptOpenedButton />, state);

        assert.isFalse(component.find('[label="Accept opened"]').prop('isDisabled'));
    });

    it('should call "acceptOpened" action on click', () => {
        const state = mkState({initialState: {processing: false}});
        const acceptableOpenedImageIds = ['img-id-1'];
        selectors.getAcceptableOpenedImageIds.withArgs(state).returns(acceptableOpenedImageIds);

        const component = mkConnectedComponent(<AcceptOpenedButton />, state);
        component.find('[label="Accept opened"]').simulate('click');

        assert.calledOnceWith(actionsStub.acceptOpened, acceptableOpenedImageIds);
    });
});
