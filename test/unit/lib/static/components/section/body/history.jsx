import {expect} from 'chai';
import React from 'react';
import {defaultsDeep, set} from 'lodash';
import History from 'lib/static/components/section/body/history';
import {mkConnectedComponent} from '../../../utils';
import userEvent from '@testing-library/user-event';

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

        expect(component.queryByText('History', {selector: '.details__summary'})).to.not.exist;
    });

    it('should render history if exists', async () => {
        const user = userEvent.setup();
        const initialState = set({}, 'tree.results.byId.default-result.history', ['some-history']);

        const component = mkHistoryComponent({resultId: 'default-result'}, initialState);

        await user.click(component.getByText('History'));

        expect(component.getByText('some-history')).to.exist;
    });

    it('should render with "History" title', () => {
        const initialState = set({}, 'tree.results.byId.default-result.history', ['some-history']);

        const component = mkHistoryComponent({resultId: 'default-result'}, initialState);

        expect(component.getByText('History', {selector: '.details__summary'})).to.exist;
    });
});
