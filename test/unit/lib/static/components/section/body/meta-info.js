import React from 'react';
import {defaultsDeep} from 'lodash';
import MetaInfo from 'lib/static/components/section/body/meta-info';
import {mkConnectedComponent} from '../../utils';

describe('<MetaInfo />', () => {
    const mkMetaInfoComponent = (props = {}, initialState = {}) => {
        props = defaultsDeep(props, {
            result: {
                metaInfo: {},
                suiteUrl: 'default-url'
            },
            testName: 'default suite test'
        });

        return mkConnectedComponent(<MetaInfo {...props} />, {initialState});
    };

    it('should render meta info from result, extra meta and link to url', () => {
        const result = {metaInfo: {foo: 'bar'}, suiteUrl: 'some-url'};
        const testName = 'suite test';
        const apiValues = {
            extraItems: {baz: 'qux'},
            metaInfoExtenders: {
                baz: ((data, extraItems) => `${data.testName}_${extraItems.baz}`).toString()
            }
        };
        const expectedMetaInfo = ['foo: bar', `baz: ${testName}_qux`, 'url: some-url'];

        const component = mkMetaInfoComponent({result, testName}, {apiValues});

        component.find('.meta-info__item').forEach((node, i) => {
            assert.equal(node.text(), expectedMetaInfo[i]);
        });
    });

    it('should render meta-info with non-primitive values', () => {
        const result = {
            metaInfo: {
                foo1: {bar: 'baz'},
                foo2: [{bar: 'baz'}]
            },
            suiteUrl: 'some-url'
        };
        const expectedMetaInfo = [
            'foo1: {"bar":"baz"}',
            'foo2: [{"bar":"baz"}]',
            'url: some-url'
        ];

        const component = mkMetaInfoComponent({result});

        component.find('.details_type_text_item').forEach((node, i) => {
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
            const result = {
                metaInfo: {file: 'test/file'}
            };
            const initialConfig = {config: {metaInfoBaseUrls: stub.metaInfoBaseUrls}};

            const component = mkMetaInfoComponent({result}, initialConfig);
            component.find('.details__summary').simulate('click');

            assert.equal(component.find('.meta-info__item:first-child').text(), 'file: test/file');
            assert.equal(component.find('.meta-info__item:first-child a').prop('href'), stub.expectedFileUrl);
        });
    });
});
