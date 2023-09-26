import React from 'react';
import {defaults} from 'lodash';
import RetrySwitcherItem from 'lib/static/components/retry-switcher/item';
import {FAIL, ERROR, SUCCESS} from 'lib/constants/test-statuses';
import {mkConnectedComponent} from '../utils';
import {ErrorName} from 'lib/errors';

describe('<RetrySwitcherItem />', () => {
    const sandbox = sinon.sandbox.create();

    const mkRetrySwitcherItem = (props = {}, initialState = {}) => {
        props = defaults(props, {
            resultId: 'default-id',
            isActive: true,
            onClick: sinon.stub()
        });

        initialState = defaults(initialState, {
            tree: {
                results: {
                    byId: {'default-id': {status: SUCCESS, attempt: 0}},
                    stateById: {'default-id': {}}
                }
            }
        });

        return mkConnectedComponent(<RetrySwitcherItem {...props} />, {initialState});
    };

    afterEach(() => sandbox.restore());

    describe('should render button', () => {
        [
            {
                name: `with "${ErrorName.NO_REF_IMAGE}"`,
                error: {name: ErrorName.NO_REF_IMAGE, stack: ''}
            },
            {
                name: `with "${ErrorName.ASSERT_VIEW}"`,
                error: {name: ErrorName.ASSERT_VIEW, stack: ''}
            },
            {
                name: `with "${ErrorName.IMAGE_DIFF}"`,
                error: {name: ErrorName.IMAGE_DIFF, stack: ''}
            }
        ].forEach(({name, error}) => {
            it(`with ${FAIL} status class name if test fails ${name}`, () => {
                const initialState = {
                    tree: {
                        results: {
                            byId: {
                                'result-1': {status: FAIL, attempt: 0, error}
                            },
                            stateById: {'result-1': {}}
                        }
                    }
                };

                const component = mkRetrySwitcherItem({resultId: 'result-1', isActive: true}, initialState);

                assert.lengthOf(component.find('.tab-switcher__button'), 1);
                assert.lengthOf(component.find(`.tab-switcher__button_status_${FAIL}`), 1);
            });
        });

        it(`with combination of ${FAIL} and ${ERROR} status class name if test fails with diff and assert`, () => {
            const initialState = {
                tree: {
                    results: {
                        byId: {
                            'result-1': {status: FAIL, attempt: 0, error: {stack: 'assert error'}}
                        },
                        stateById: {'result-1': {}}
                    }
                }
            };

            const component = mkRetrySwitcherItem({resultId: 'result-1', isActive: true}, initialState);

            assert.lengthOf(component.find('.tab-switcher__button'), 1);
            assert.lengthOf(component.find(`.tab-switcher__button_status_${FAIL}_${ERROR}`), 1);
        });

        it('without non matched class if group is not selected', () => {
            const initialState = {
                tree: {
                    results: {
                        byId: {'result-1': {status: SUCCESS, attempt: 0}},
                        stateById: {'result-1': {}}
                    }
                },
                view: {keyToGroupTestsBy: ''}
            };

            const component = mkRetrySwitcherItem({resultId: 'result-1'}, initialState);

            assert.lengthOf(component.find('.tab-switcher__button'), 1);
            assert.lengthOf(component.find('.tab-switcher__button_non-matched'), 0);
        });

        it('without non matched class if group is selected and result is matched on it', () => {
            const initialState = {
                tree: {
                    results: {
                        byId: {'result-1': {status: SUCCESS, attempt: 0}},
                        stateById: {'result-1': {matchedSelectedGroup: true}}
                    }
                },
                view: {keyToGroupTestsBy: 'some-key'}
            };

            const component = mkRetrySwitcherItem({resultId: 'result-1'}, initialState);

            assert.lengthOf(component.find('.tab-switcher__button'), 1);
            assert.lengthOf(component.find('.tab-switcher__button_non-matched'), 0);
        });

        it('with non matched class if group is selected but result is not matched on it', () => {
            const initialState = {
                tree: {
                    results: {
                        byId: {'result-1': {status: SUCCESS, attempt: 0}},
                        stateById: {'result-1': {matchedSelectedGroup: false}}
                    }
                },
                view: {keyToGroupTestsBy: 'some-key'}
            };

            const component = mkRetrySwitcherItem({resultId: 'result-1'}, initialState);

            assert.lengthOf(component.find('.tab-switcher__button'), 1);
            assert.lengthOf(component.find('.tab-switcher__button_non-matched'), 1);
        });
    });

    it('should render button with text from result "attempt" increased by one', () => {
        const initialState = {
            tree: {
                results: {
                    byId: {
                        'result-1': {status: FAIL, attempt: 100499}
                    },
                    stateById: {'result-1': {}}
                }
            }
        };

        const component = mkRetrySwitcherItem({resultId: 'result-1'}, initialState);
        const text = component.find('.tab-switcher__button').text();

        assert.equal(text, 100500);
    });

    it('should render button with correct active class name', () => {
        const component = mkRetrySwitcherItem({isActive: true});

        assert.lengthOf(component.find('.tab-switcher__button'), 1);
        assert.lengthOf(component.find('.tab-switcher__button_active'), 1);
    });

    it('should call "onClick" handler on click in button', () => {
        const onClick = sinon.stub();

        const component = mkRetrySwitcherItem({onClick});
        component.find('.tab-switcher__button').simulate('click');

        assert.calledOnceWith(onClick);
    });
});
