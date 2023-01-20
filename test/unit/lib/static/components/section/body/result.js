import React from 'react';
import proxyquire from 'proxyquire';
import {defaults, set} from 'lodash';
import {FAIL, SUCCESS} from 'lib/constants/test-statuses';
import {mkConnectedComponent} from '../../utils';

describe('<Result />', () => {
    const sandbox = sinon.sandbox.create();
    let Result, MetaInfo, History, Description, Tabs;

    const mkResult = (props = {}, initialState = {}) => {
        props = defaults(props, {
            resultId: 'default-id',
            testName: 'suite test'
        });

        initialState = defaults(initialState, {
            tree: {
                results: {
                    byId: {
                        'default-id': {
                            status: SUCCESS,
                            imageIds: [],
                            history: []
                        }
                    }
                }
            }
        });

        return mkConnectedComponent(<Result {...props} />, {initialState});
    };

    beforeEach(() => {
        MetaInfo = sinon.stub().returns(null);
        Description = sinon.stub().returns(null);
        History = sinon.stub().returns(null);
        Tabs = sinon.stub().returns(null);

        Result = proxyquire('lib/static/components/section/body/result', {
            './meta-info': {default: MetaInfo},
            './history': {default: History},
            './description': {default: Description},
            './tabs': {default: Tabs}
        }).default;
    });

    afterEach(() => sandbox.restore());

    describe('"MetaInfo" component', () => {
        it('should render with result and test name props', () => {
            const result = {status: FAIL, imageIds: ['image-1']};
            const initialState = set({}, 'tree.results.byId.result-1', result);

            mkResult({resultId: 'result-1', testName: 'test-name'}, initialState);

            assert.calledOnceWith(MetaInfo, {resultId: 'result-1'});
        });
    });

    describe('"History" component', () => {
        it('should render with resultId prop', () => {
            const result = {status: FAIL, imageIds: ['image-1'], history: []};
            const initialState = set({}, 'tree.results.byId.result-1', result);

            mkResult({resultId: 'result-1', testName: 'test-name'}, initialState);

            assert.calledOnceWith(History, {resultId: 'result-1'});
        });
    });

    describe('"Description" component', () => {
        it('should not render if description does not exists in result', () => {
            const result = {status: FAIL, imageIds: [], description: null};
            const initialState = {
                tree: {
                    results: {
                        byId: {
                            'result-1': result
                        }
                    }
                }
            };

            mkResult({resultId: 'result-1'}, initialState);

            assert.notCalled(Description);
        });

        it('should render if description exists in result', () => {
            const result = {status: FAIL, imageIds: [], description: 'some-descr'};
            const initialState = {
                tree: {
                    results: {
                        byId: {
                            'result-1': result
                        }
                    }
                }
            };

            mkResult({resultId: 'result-1'}, initialState);

            assert.calledOnceWith(Description, {content: 'some-descr'});
        });
    });

    describe('"Tabs" component', () => {
        it('should render with result prop', () => {
            const result = {status: FAIL, imageIds: []};
            const initialState = {
                tree: {
                    results: {
                        byId: {
                            'result-1': result
                        }
                    }
                }
            };

            mkResult({resultId: 'result-1'}, initialState);

            assert.calledOnceWith(Tabs, {result});
        });
    });
});
