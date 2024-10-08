import {RenderResult} from '@testing-library/react';
import {expect} from 'chai';
import {defaultsDeep} from 'lodash';
import React from 'react';

import {MetaInfo, MetaInfoProps} from 'lib/static/new-ui/components/MetaInfo';
import {mkConnectedComponent} from '../../utils';

describe('<MetaInfo />', () => {
    const mkMetaInfoComponent = (props: MetaInfoProps, initialState = {}): RenderResult => {
        props = defaultsDeep(props, {
            resultId: 'default-result-id',
            testName: 'default suite test'
        });
        initialState = defaultsDeep(initialState, {
            tree: {
                results: {
                    byId: {
                        'default-result': {
                            metaInfo: {},
                            suiteUrl: 'default-url',
                            parentId: 'default-browser'
                        }
                    }
                },
                browsers: {
                    byId: {
                        'default-browser': {
                            parentId: 'default-suite'
                        }
                    }
                }
            }
        });

        return mkConnectedComponent(<MetaInfo {...props} />, {initialState});
    };

    it('should render meta info from result, extra meta and link to url', () => {
        const tree = {
            results: {
                byId: {
                    'some-result': {
                        metaInfo: {foo: 'bar'},
                        suiteUrl: 'some-url',
                        parentId: 'some-browser'
                    }
                }
            },
            browsers: {
                byId: {
                    'some-browser': {
                        parentId: 'some-suite'
                    }
                }
            }
        };
        const apiValues = {
            extraItems: {baz: 'qux'},
            metaInfoExtenders: {
                baz: ((data: {testName: string}, extraItems: Record<string, string>): string => `${data.testName}_${extraItems.baz}`).toString()
            }
        };
        const expectedMetaInfo = [
            ['foo', 'bar'],
            ['baz', 'some-suite_qux'],
            ['url', 'some-url']
        ];

        const component = mkMetaInfoComponent({resultId: 'some-result'}, {tree, apiValues});

        expectedMetaInfo.forEach((node) => {
            expect(component.getByText(node[0])).to.exist;
            expect(component.getByText(node[1])).to.exist;
        });
    });

    it('should render meta-info with non-primitive values', () => {
        const tree = {
            results: {
                byId: {
                    'some-result': {
                        metaInfo: {
                            foo1: {bar: 'baz'},
                            foo2: [{bar: 'baz'}]
                        },
                        suiteUrl: 'some-url',
                        parentId: 'some-browser'
                    }
                }
            },
            browsers: {
                byId: {
                    'some-browser': {
                        parentId: 'some-suite'
                    }
                }
            }
        };
        const expectedMetaInfo = [
            ['foo1', '{"bar":"baz"}'],
            ['foo2', '[{"bar":"baz"}]'],
            ['url', 'some-url']
        ];

        const component = mkMetaInfoComponent({resultId: 'some-result'}, {tree});

        expectedMetaInfo.forEach((node) => {
            expect(component.getByText(node[0])).to.exist;
            expect(component.getByText(node[1])).to.exist;
        });
    });

    it('should render boolean values of meta-info as text', () => {
        const tree = {
            results: {
                byId: {
                    'some-result': {
                        metaInfo: {
                            foo1: true,
                            foo2: false
                        },
                        suiteUrl: 'some-url',
                        parentId: 'some-browser'
                    }
                }
            },
            browsers: {
                byId: {
                    'some-browser': {
                        parentId: 'some-suite'
                    }
                }
            }
        };
        const expectedMetaInfo = [
            ['foo1', 'true'],
            ['foo2', 'false'],
            ['url', 'some-url']
        ];

        const component = mkMetaInfoComponent({resultId: 'some-result'}, {tree});

        expectedMetaInfo.forEach((node) => {
            expect(component.getByText(node[0])).to.exist;
            expect(component.getByText(node[1])).to.exist;
        });
    });

    [
        {
            type: 'path',
            metaInfo: {
                file: 'test/file'
            },
            metaInfoBaseUrls: {file: 'base/path'},
            expectedFileUrl: 'http://localhost/base/path/test/file'
        },
        {
            type: 'url',
            metaInfo: {
                file: 'test/file'
            },
            metaInfoBaseUrls: {file: 'http://127.0.0.1'},
            expectedFileUrl: 'http://127.0.0.1/test/file'
        },
        {
            type: 'url with one query param',
            metaInfo: {
                file: 'test/file'
            },
            metaInfoBaseUrls: {
                file: 'http://127.0.0.1?a=b'
            },
            expectedFileUrl: 'http://127.0.0.1/test/file?a=b'
        },
        {
            type: 'url with few query params',
            metaInfo: {
                file: 'test/file'
            },
            metaInfoBaseUrls: {
                file: 'http://127.0.0.1?a=b&b=c&c=d'
            },
            expectedFileUrl: 'http://127.0.0.1/test/file?a=b&b=c&c=d'
        },
        {
            type: 'url with pathname',
            metaInfo: {
                file: 'test/file'
            },
            metaInfoBaseUrls: {
                file: 'http://127.0.0.1/path/'
            },
            expectedFileUrl: 'http://127.0.0.1/path/test/file'
        },
        {
            type: 'url when baseHost is not set and metaBaseUrls is not set',
            metaInfo: {
                file: 'http://localhost/test/file?a=b'
            },
            metaInfoBaseUrls: {},
            baseHost: 'http://example.com/',
            expectedFileLabel: 'http://localhost/test/file?a=b',
            expectedFileUrl: 'http://localhost/test/file?a=b'
        },
        {
            type: 'url when baseHost is not set and metaBaseUrls set to auto',
            metaInfo: {
                file: 'http://localhost/test/file?a=b'
            },
            metaInfoBaseUrls: {
                file: 'auto'
            },
            expectedFileLabel: '/test/file?a=b',
            expectedFileUrl: 'http://localhost/test/file?a=b'
        },
        {
            type: 'url when baseHost is set and metaBaseUrls set to auto',
            metaInfo: {
                file: 'http://localhost/test/file?a=b'
            },
            metaInfoBaseUrls: {
                file: 'auto'
            },
            baseHost: 'http://example.com/',
            expectedFileLabel: '/test/file?a=b',
            expectedFileUrl: 'http://example.com/test/file?a=b'
        }
    ].forEach((stub) => {
        it(`should render link in meta info based upon metaInfoBaseUrls ${stub.type}`, () => {
            const tree = {
                results: {
                    byId: {
                        'some-result': {
                            metaInfo: stub.metaInfo,
                            suiteUrl: 'some-url',
                            parentId: 'some-browser'
                        }
                    }
                },
                browsers: {
                    byId: {
                        'some-browser': {
                            parentId: 'some-suite'
                        }
                    }
                }
            };
            const config = {metaInfoBaseUrls: stub.metaInfoBaseUrls};
            const view = {baseHost: stub.baseHost};
            const component = mkMetaInfoComponent({resultId: 'some-result'}, {tree, config, view});

            const label = stub.expectedFileLabel ?? stub.metaInfo.file;
            expect(component.getByText('file')).to.exist;
            expect(component.getByText(label)).to.exist;
            expect((component.getByText(label) as HTMLLinkElement).href).to.equal(stub.expectedFileUrl);
        });
    });
});
