import {expect} from 'chai';
import React from 'react';
import proxyquire from 'proxyquire';
import {defaultsDeep} from 'lodash';
import {ERROR, FAIL, SUCCESS} from 'lib/constants/test-statuses';
import {mkConnectedComponent} from '../../../utils';

describe('<Tabs />', () => {
    const sandbox = sinon.sandbox.create();
    let Tabs, State;

    const mkTabs = (props = {}, state) => {
        props = defaultsDeep(props, {
            result: {
                id: 'default-result-id',
                status: SUCCESS,
                imageIds: []
            }
        });

        const initialState = defaultsDeep(state, {
            initialState: {
                tree: {
                    images: {
                        byId: {
                            'img-1': {stateName: 'some-state'},
                            'img-2': {stateName: 'some-state'}
                        }
                    }
                }
            }
        });

        return mkConnectedComponent(<Tabs {...props} />, initialState);
    };

    beforeEach(() => {
        State = sinon.stub().returns(null);

        Tabs = proxyquire('lib/static/components/section/body/tabs', {
            '../../state': {default: State}
        }).default;
    });

    afterEach(() => sandbox.restore());

    it('should not render image tabs if images does not exist and test passed successfully', () => {
        const result = {status: SUCCESS, imageIds: []};

        const component = mkTabs({result});

        expect(component.container.querySelector('.tab')).to.not.exist;
        assert.notCalled(State);
    });

    it('should render error tab if test failed without images', () => {
        const result = {status: ERROR, imageIds: []};

        const component = mkTabs({result});

        expect(component.container.querySelector('.tab')).to.exist;
        assert.calledOnceWith(State, {result, imageId: null});
    });

    it('should render image tab for each image id', () => {
        const result = {status: FAIL, imageIds: ['img-1', 'img-2']};

        const component = mkTabs({result});

        expect(component.container.querySelectorAll('.tab').length).to.equal(2);
        assert.calledTwice(State);
        assert.calledWith(State.firstCall, {result, imageId: 'img-1'});
        assert.calledWith(State.secondCall, {result, imageId: 'img-2'});
    });

    it('should not render additional error tab if test errored with screenshot on reject', () => {
        const result = {status: FAIL, imageIds: ['img-1'], screenshot: true};

        const component = mkTabs({result});

        expect(component.container.querySelector('.tab')).to.exist;
        assert.calledOnceWith(State, {result, imageId: 'img-1'});
    });

    it('should render additional error tab if test errored without screenshot on reject', () => {
        const result = {status: ERROR, imageIds: ['img-1'], screenshot: false};

        const component = mkTabs({result});

        expect(component.container.querySelectorAll('.tab').length).to.equal(2);
        assert.calledTwice(State);
        assert.calledWith(State.firstCall, {result, imageId: 'img-1'});
        assert.calledWith(State.secondCall, {result, imageId: null});
    });
});
