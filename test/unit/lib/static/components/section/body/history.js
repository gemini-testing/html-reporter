import React from 'react';
import {defaultsDeep, set} from 'lodash';
import proxyquire from 'proxyquire';
import {mkConnectedComponent} from '../../utils';

describe('<History />', () => {
    const sandbox = sinon.sandbox.create();
    let History, Details;

    beforeEach(() => {
        Details = sinon.stub().returns(null);

        History = proxyquire('lib/static/components/section/body/history', {
            '../../../details': {default: Details}
        }).default;
    });

    afterEach(() => sandbox.restore());

    const mkHistoryComponent = (props = {}, initialState = {}) => {
        props = defaultsDeep(props, {
            resultId: 'default-result'
        });

        return mkConnectedComponent(<History {...props} />, {initialState});
    };

    it('should not render if history does not exists', () => {
        const initialState = set({}, 'tree.results.byId.default-result', {});

        mkHistoryComponent({resultId: 'default-result'}, initialState);

        assert.notCalled(Details);
    });

    it('should render history if exists', () => {
        const initialState = set({}, 'tree.results.byId.default-result.history', 'some-history');

        const component = mkHistoryComponent({resultId: 'default-result'}, initialState);

        assert.equal(component.find(Details).prop('content'), 'some-history');
    });

    it('should render with "History" title', () => {
        const initialState = set({}, 'tree.results.byId.default-result.history', 'some-history');

        const component = mkHistoryComponent({resultId: 'default-result'}, initialState);

        assert.equal(component.find(Details).prop('title'), 'History');
    });
});
