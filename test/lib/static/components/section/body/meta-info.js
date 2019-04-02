import React from 'react';
import {defaults} from 'lodash';
import MetaInfo from 'lib/static/components/section/body/meta-info';
import {mkConnectedComponent} from '../../utils';

describe('<MetaInfo />', () => {
    const sandbox = sinon.createSandbox();

    let getExtraMetaInfo;

    const mkMetaInfoComponent = (props = {}) => {
        props = defaults(props, {
            metaInfo: {},
            suiteUrl: 'default-url',
            getExtraMetaInfo
        });

        return mkConnectedComponent(<MetaInfo {...props} />);
    };

    beforeEach(() => {
        getExtraMetaInfo = sandbox.stub().named('getExtraMetaInfo').returns({});
    });

    afterEach(() => sandbox.restore());

    it('should render all meta info from test, extra meta info and link to url', () => {
        getExtraMetaInfo.returns({baz: 'qux'});
        const expectedMetaInfo = ['foo: bar', 'baz: qux', 'url: some-url'];

        const component = mkMetaInfoComponent({metaInfo: {foo: 'bar'}, suiteUrl: 'some-url'});

        component.find('.toggle-open__item').forEach((node, i) => {
            assert.equal(node.text(), expectedMetaInfo[i]);
        });
    });
});
