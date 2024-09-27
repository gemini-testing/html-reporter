import {RenderResult} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect} from 'chai';
import {defaults} from 'lodash';
import React from 'react';
import sinon from 'sinon';

import styles from 'lib/static/new-ui/components/AttemptPickerItem/index.module.css';
import {FAIL, ERROR, SUCCESS, FAIL_ERROR} from 'lib/constants/test-statuses';
import {ErrorName} from 'lib/errors';
import {AttemptPickerItem, AttemptPickerItemProps} from 'lib/static/new-ui/components/AttemptPickerItem';
import {mkConnectedComponent} from '../../utils';

describe('<AttemptPickerItem />', () => {
    const sandbox = sinon.sandbox.create();

    const mkAttemptPickerItem = (props: AttemptPickerItemProps, initialState = {}): RenderResult => {
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

        return mkConnectedComponent(<AttemptPickerItem {...props} />, {initialState});
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

                const component = mkAttemptPickerItem({resultId: 'result-1', isActive: true}, initialState);

                expect(component.container.querySelector(`button[data-qa="retry-switcher"].${styles[`attempt-picker-item--${FAIL}`]}`)).to.exist;
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

            const component = mkAttemptPickerItem({resultId: 'result-1', isActive: true}, initialState);

            expect(component.container.querySelector(`button[data-qa="retry-switcher"].${styles[`attempt-picker-item--${FAIL_ERROR}`]}`)).to.exist;
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

            const component = mkAttemptPickerItem({resultId: 'result-1'}, initialState);

            expect(component.container.querySelector('button[data-qa="retry-switcher"]')).to.exist;
            expect(component.container.querySelector('button[data-qa="retry-switcher"].tab-switcher__button_non-matched')).to.not.exist;
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

            const component = mkAttemptPickerItem({resultId: 'result-1'}, initialState);

            expect(component.container.querySelector('button[data-qa="retry-switcher"]')).to.exist;
            expect(component.container.querySelector('button[data-qa="retry-switcher"].tab-switcher__button_non-matched')).to.not.exist;
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

            const component = mkAttemptPickerItem({resultId: 'result-1'}, initialState);

            expect(component.container.querySelector('button[data-qa="retry-switcher"]')).to.exist;
            expect(component.container.querySelector(`button[data-qa="retry-switcher"].${styles['attempt-picker-item--non-matched']}`)).to.exist;
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

        const component = mkAttemptPickerItem({resultId: 'result-1'}, initialState);

        expect(component.getByText('100500', {selector: 'button[data-qa="retry-switcher"] > *'})).to.exist;
    });

    it('should render button with correct active class name', () => {
        const component = mkAttemptPickerItem({resultId: 'default-id', isActive: true});

        expect(component.container.querySelector(`button[data-qa="retry-switcher"].${styles['attempt-picker-item--active']}`)).to.exist;
    });

    it('should call "onClick" handler on click in button', async () => {
        const user = userEvent.setup();
        const onClick = sinon.stub();

        const component = mkAttemptPickerItem({resultId: 'default-id', onClick});
        await user.click(component.getByTestId('retry-switcher'));

        assert.calledOnceWith(onClick);
    });
});
