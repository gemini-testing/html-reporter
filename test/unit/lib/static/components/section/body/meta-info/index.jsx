import React from 'react';
import {defaultsDeep} from 'lodash';
import proxyquire from 'proxyquire';
import {mkConnectedComponent} from '../../../../utils';
import userEvent from '@testing-library/user-event';

describe('<MetaInfo />', () => {
    const sandbox = sinon.sandbox.create();
    let MetaInfo, MetaInfoContent;

    beforeEach(() => {
        MetaInfoContent = sinon.stub().returns(null);

        MetaInfo = proxyquire('lib/static/components/section/body/meta-info', {
            '@/static/new-ui/components/MetaInfo': {MetaInfo: MetaInfoContent}
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
        it('should render with correct props', async () => {
            const user = userEvent.setup();
            const component = mkMetaInfoComponent({resultId: 'some-result'});

            await user.click(component.getByText('Meta'));

            assert.calledOnceWith(
                MetaInfoContent,
                {qa: 'meta-info', resultId: 'some-result'}
            );
        });
    });
});
