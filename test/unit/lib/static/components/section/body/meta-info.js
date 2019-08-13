import React from 'react';
import {defaults} from 'lodash';
import MetaInfo from 'lib/static/components/section/body/meta-info';
import {mkConnectedComponent} from '../../utils';

describe('<MetaInfo />', () => {
    const sandbox = sinon.createSandbox();

    let getExtraMetaInfo;

    const mkMetaInfoComponent = (props = {}, initialState = {}) => {
        props = defaults(props, {
            metaInfo: {},
            suiteUrl: 'default-url',
            getExtraMetaInfo
        });

        return mkConnectedComponent(<MetaInfo {...props} />, {initialState});
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

    it('should render meta-info with non-primitive values', () => {
        const expectedMetaInfo = [
            'foo1: {"bar":"baz"}',
            'foo2: [{"bar":"baz"}]',
            'url: some-url'
        ];

        const metaInfo = {
            foo1: {bar: 'baz'},
            foo2: [{bar: 'baz'}]
        };

        const component = mkMetaInfoComponent({metaInfo, suiteUrl: 'some-url'});

        component.find('.toggle-open__item').forEach((node, i) => {
            assert.equal(node.text(), expectedMetaInfo[i]);
        });
    });

    [
        {
            type: 'path',
            metaInfoBaseUrls: {file: 'base/path'},
            expectedFileUrl: 'base/path/test/file'
        },
        {
            type: 'url',
            metaInfoBaseUrls: {file: 'http://127.0.0.1'},
            expectedFileUrl: 'http://127.0.0.1/test/file'
        }
    ].forEach((stub) => {
        it(`should render link in meta info based upon metaInfoBaseUrls ${stub.type}`, () => {
            const initialConfig = {config: {metaInfoBaseUrls: stub.metaInfoBaseUrls}};

            const component = mkMetaInfoComponent({metaInfo: {file: 'test/file'}}, initialConfig);

            assert.equal(component.find('.toggle-open__item:first-child').text(), 'file: test/file');
            assert.equal(component.find('.toggle-open__item:first-child a').prop('href'), stub.expectedFileUrl);
        });
    });
});
