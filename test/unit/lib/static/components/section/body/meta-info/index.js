import React from 'react';
import {defaultsDeep} from 'lodash';
import proxyquire from 'proxyquire';
import {mkConnectedComponent} from '../../../utils';

describe('<MetaInfo />', () => {
    const sandbox = sinon.sandbox.create();
    let MetaInfo, MetaInfoContent, actionsStub;

    beforeEach(() => {
        actionsStub = {
            toggleMetaInfo: sandbox.stub().returns({type: 'some-type'})
        };

        MetaInfoContent = sinon.stub().returns(null);

        MetaInfo = proxyquire('lib/static/components/section/body/meta-info', {
            './content': {default: MetaInfoContent},
            '../../../../modules/actions': actionsStub
        }).default;
    });

    afterEach(() => sandbox.restore());

    const mkMetaInfoComponent = (props = {}, initialState = {}) => {
        props = defaultsDeep(props, {
            resultId: 'default-result'
        });

        return mkConnectedComponent(<MetaInfo {...props} />, {initialState});
    };

    describe('"MetaInfoContent"', () => {
        it('should render with correct props', () => {
            const component = mkMetaInfoComponent({resultId: 'some-result'});

            component.find('.details__summary').simulate('click');

            assert.calledOnceWith(
                MetaInfoContent,
                {resultId: 'some-result'}
            );
        });
    });

    describe('"toggleMetaInfo" action', () => {
        it('should call on click in details', () => {
            const component = mkMetaInfoComponent();

            component.find('.details__summary').simulate('click');

            assert.calledOnceWith(actionsStub.toggleMetaInfo);
        });
    });
});
