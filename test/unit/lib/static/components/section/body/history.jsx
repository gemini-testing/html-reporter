import React from 'react';
import {defaultsDeep, set} from 'lodash';
import History from 'lib/static/components/section/body/history';
import {mkConnectedComponent} from '../../utils';

describe('<History />', () => {
    const mkHistoryComponent = (props = {}, initialState = {}) => {
        props = defaultsDeep(props, {
            resultId: 'default-result'
        });

        return mkConnectedComponent(<History {...props} />, {initialState});
    };

    it('should not render if history does not exists', () => {
        const initialState = set({}, 'tree.results.byId.default-result', {});

        const component = mkHistoryComponent({resultId: 'default-result'}, initialState);

        assert.equal(component.find('.history').length, 0);
    });

    it('should render history if exists', () => {
        const initialState = set({}, 'tree.results.byId.default-result.history', ['some-history']);

        const component = mkHistoryComponent({resultId: 'default-result'}, initialState);

        component.find('.details__summary').simulate('click');

        assert.equal(component.find('.history-item').text(), 'some-history');
    });

    it('should render with "History" title', () => {
        const initialState = set({}, 'tree.results.byId.default-result.history', ['some-history']);

        const component = mkHistoryComponent({resultId: 'default-result'}, initialState);

        assert.equal(component.find('.details__summary').text(), 'History');
    });
});
