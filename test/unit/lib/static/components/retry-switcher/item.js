import React from 'react';
import {defaults} from 'lodash';
import RetrySwitcherItem from 'lib/static/components/retry-switcher/item';
import {FAIL, SUCCESS} from 'lib/constants/test-statuses';
import {mkConnectedComponent} from '../utils';

describe('<RetrySwitcherItem />', () => {
    const sandbox = sinon.sandbox.create();

    const mkRetrySwitcherItem = (props = {}, initialState = {}) => {
        props = defaults(props, {
            resultId: 'default-id',
            isActive: true,
            onClick: sinon.stub()
        });

        initialState = defaults(initialState, {
            tree: {
                results: {
                    byId: {
                        'default-id': {status: SUCCESS, attempt: 0}
                    }
                }
            }
        });

        return mkConnectedComponent(<RetrySwitcherItem {...props} />, {initialState});
    };

    afterEach(() => sandbox.restore());

    it('should render button with status class name', () => {
        const initialState = {
            tree: {
                results: {
                    byId: {
                        'result-1': {status: FAIL, attempt: 0}
                    }
                }
            }
        };

        const component = mkRetrySwitcherItem({resultId: 'result-1', isActive: true}, initialState);

        assert.lengthOf(component.find('.tab-switcher__button'), 1);
        assert.lengthOf(component.find(`.tab-switcher__button_status_${FAIL}`), 1);
    });

    it('should render button with text from result "attempt" increased by one', () => {
        const initialState = {
            tree: {
                results: {
                    byId: {
                        'result-1': {status: FAIL, attempt: 100499}
                    }
                }
            }
        };

        const component = mkRetrySwitcherItem({resultId: 'result-1'}, initialState);
        const text = component.find('.tab-switcher__button').text();

        assert.equal(text, 100500);
    });

    it('should render button with correct active class name', () => {
        const component = mkRetrySwitcherItem({isActive: true});

        assert.lengthOf(component.find('.tab-switcher__button'), 1);
        assert.lengthOf(component.find('.tab-switcher__button_active'), 1);
    });

    it('should call "onClick" handler on click in button', () => {
        const onClick = sinon.stub();

        const component = mkRetrySwitcherItem({onClick});
        component.find('.tab-switcher__button').simulate('click');

        assert.calledOnceWith(onClick);
    });
});
