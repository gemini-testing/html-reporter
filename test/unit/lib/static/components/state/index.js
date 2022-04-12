import React from 'react';
import proxyquire from 'proxyquire';
import {defaults, defaultsDeep} from 'lodash';
import {SUCCESS, FAIL, ERROR} from 'lib/constants/test-statuses';
import {EXPAND_ALL} from 'lib/constants/expand-modes';
import {types as modalTypes} from 'lib/static/components/modals';
import {mkConnectedComponent} from '../utils';

describe('<State/>', () => {
    const sandbox = sinon.sandbox.create();
    let State, StateError, StateSuccess, StateFail, FindSameDiffsButton, utilsStub, actionsStub, selectors, getLastImageByStateName;

    const mkStateComponent = (props = {}, initialState = {}) => {
        props = defaults(props, {
            result: {status: SUCCESS},
            imageId: 'default-img-id'
        });

        initialState = defaultsDeep(initialState, {
            tree: {
                images: {
                    byId: {
                        'default-img-id': {
                            stateName: 'default-state',
                            expectedImg: {},
                            status: SUCCESS
                        }
                    },
                    stateById: {
                        'default-img-id': {shouldBeOpened: false}
                    }
                }
            },
            view: {expand: EXPAND_ALL}
        });

        return mkConnectedComponent(<State {...props} />, {initialState});
    };

    beforeEach(() => {
        utilsStub = {isAcceptable: sandbox.stub()};

        actionsStub = {
            toggleStateResult: sandbox.stub().returns({type: 'some-type'}),
            acceptTest: sandbox.stub().returns({type: 'some-type'}),
            openModal: sandbox.stub().returns({type: 'some-type'})
        };

        getLastImageByStateName = sandbox.stub().returns({status: SUCCESS});
        selectors = {
            mkGetLastImageByStateName: sandbox.stub().returns(getLastImageByStateName)
        };

        StateError = sinon.stub().returns(null);
        StateSuccess = sinon.stub().returns(null);
        StateFail = sinon.stub().returns(null);
        FindSameDiffsButton = sinon.stub().returns(null);

        State = proxyquire('lib/static/components/state', {
            './state-error': {default: StateError},
            './state-success': {default: StateSuccess},
            './state-fail': {default: StateFail},
            '../controls/find-same-diffs-button': {default: FindSameDiffsButton},
            '../../modules/actions': actionsStub,
            '../../modules/utils': utilsStub,
            '../../modules/selectors/tree': selectors
        }).default;
    });

    afterEach(() => sandbox.restore());

    describe('"Accept" button', () => {
        it('should not render button in static report', () => {
            const stateComponent = mkStateComponent({}, {gui: false});

            assert.lengthOf(stateComponent.find('[label="✔ Accept"]'), 0);
        });

        it('should render button in gui report if image is acceptable', () => {
            const image = {stateName: 'some-name', state: FAIL};
            const initialState = {
                tree: {
                    images: {
                        byId: {'img-id': image},
                        stateById: {'img-id': {shouldBeOpened: true}}
                    }
                }
            };
            utilsStub.isAcceptable.withArgs(image).returns(true);

            const stateComponent = mkStateComponent({imageId: 'img-id'}, {gui: true, ...initialState});

            assert.lengthOf(stateComponent.find('[label="✔ Accept"]'), 1);
        });

        it('should not render button if image is not acceptable', () => {
            const image = {stateName: 'some-name', status: SUCCESS};
            const initialState = {
                tree: {
                    images: {
                        byId: {'img-id': image},
                        stateById: {'img-id': {shouldBeOpened: true}}
                    }
                }
            };
            utilsStub.isAcceptable.withArgs(image).returns(false);

            const stateComponent = mkStateComponent({imageId: 'img-id'}, initialState);

            assert.isEmpty(stateComponent.find('[label="✔ Accept"]'));
        });

        it('should be enabled if image is acceptable', () => {
            const image = {stateName: 'some-name', status: FAIL};
            const initialState = {
                tree: {
                    images: {
                        byId: {'img-id': image},
                        stateById: {'img-id': {shouldBeOpened: true}}
                    }
                }
            };
            utilsStub.isAcceptable.withArgs(image).returns(true);

            const stateComponent = mkStateComponent({imageId: 'img-id'}, initialState);

            assert.isFalse(stateComponent.find('[label="✔ Accept"]').prop('isDisabled'));
        });

        it('should call "acceptTest" action on button click', () => {
            const image = {stateName: 'some-name', status: FAIL};
            const initialState = {
                tree: {
                    images: {
                        byId: {'img-id': image},
                        stateById: {'img-id': {shouldBeOpened: true}}
                    }
                }
            };
            utilsStub.isAcceptable.withArgs(image).returns(true);

            const stateComponent = mkStateComponent({imageId: 'img-id'}, initialState);
            stateComponent.find('[label="✔ Accept"]').simulate('click');

            assert.calledOnceWith(actionsStub.acceptTest, 'img-id');
        });
    });

    describe('"FindSameDiffsButton" button', () => {
        it('should not render button in static report', () => {
            mkStateComponent({}, {gui: false});

            assert.notCalled(FindSameDiffsButton);
        });

        it('should render button in gui report if image is acceptable', () => {
            const image = {stateName: 'some-name'};
            const initialState = {
                tree: {
                    images: {
                        byId: {'img-id': image},
                        stateById: {'img-id': {shouldBeOpened: true}}
                    }
                }
            };
            utilsStub.isAcceptable.withArgs(image).returns(true);

            mkStateComponent({imageId: 'img-id'}, {gui: true, ...initialState});

            assert.calledOnce(FindSameDiffsButton);
        });

        it('should be disabled if image is not failed', () => {
            const image = {stateName: 'some-name', status: ERROR};
            const initialState = {
                tree: {
                    images: {
                        byId: {'img-id': image},
                        stateById: {'img-id': {shouldBeOpened: true}}
                    }
                }
            };
            const result = {parentId: 'bro-id', status: ERROR};
            utilsStub.isAcceptable.withArgs(image).returns(true);

            mkStateComponent({result, imageId: 'img-id'}, initialState);

            assert.calledOnceWith(FindSameDiffsButton, {imageId: 'img-id', browserId: 'bro-id', isDisabled: true});
        });

        it('should be enabled if image is failed', () => {
            const image = {stateName: 'some-name', status: FAIL};
            const initialState = {
                tree: {
                    images: {
                        byId: {'img-id': image},
                        stateById: {'img-id': {shouldBeOpened: true}}
                    }
                }
            };
            const result = {parentId: 'bro-id', status: FAIL};
            utilsStub.isAcceptable.withArgs(image).returns(true);

            mkStateComponent({result, imageId: 'img-id'}, initialState);

            assert.calledOnceWith(FindSameDiffsButton, {imageId: 'img-id', browserId: 'bro-id', isDisabled: false});
        });
    });

    describe('"Switch accept mode" button', () => {
        describe('in static report', () => {
            it('should not render button', () => {
                const stateComponent = mkStateComponent({}, {gui: false});

                assert.lengthOf(stateComponent.find('[label$="Switch accept mode"]'), 0);
            });

            it('should not call "getLastImageByStateName" selector', () => {
                mkStateComponent({}, {gui: false});

                assert.notCalled(getLastImageByStateName);
            });
        });

        describe('in gui report', () => {
            it('should render button if image is acceptable', () => {
                const image = {stateName: 'some-name'};
                const initialState = {
                    tree: {
                        images: {
                            byId: {'img-id': image},
                            stateById: {'img-id': {shouldBeOpened: true}}
                        }
                    }
                };
                utilsStub.isAcceptable.withArgs(image).returns(true);

                const stateComponent = mkStateComponent({imageId: 'img-id'}, {gui: true, ...initialState});

                assert.lengthOf(stateComponent.find('[title="Open mode with fast screenshot accepting"]'), 2);
            });

            it('should not call "getLastImageByStateName" selector if image id is not passed', () => {
                mkStateComponent({imageId: null}, {gui: true});

                assert.notCalled(getLastImageByStateName);
            });

            it('should be disabled if current image is successful', () => {
                const image = {stateName: 'some-name', status: SUCCESS};
                const initialState = {
                    tree: {
                        images: {
                            byId: {'img-id': image},
                            stateById: {'img-id': {shouldBeOpened: true}}
                        }
                    },
                    gui: true
                };
                utilsStub.isAcceptable.withArgs(image).returns(true);
                getLastImageByStateName.returns(image);

                const stateComponent = mkStateComponent({imageId: 'img-id'}, initialState);

                assert.isTrue(stateComponent.find('[title="Open mode with fast screenshot accepting"]').first().prop('isDisabled'));
            });

            it('should be disabled if last image is not acceptable', () => {
                const image = {stateName: 'some-name', status: FAIL};
                const initialState = {
                    tree: {
                        images: {
                            byId: {'img-id': image},
                            stateById: {'img-id': {shouldBeOpened: true}}
                        }
                    },
                    gui: true
                };
                utilsStub.isAcceptable.withArgs(image).returns(false);
                getLastImageByStateName.returns(image);

                const stateComponent = mkStateComponent({imageId: 'img-id'}, initialState);

                assert.isTrue(stateComponent.find('[title="Open mode with fast screenshot accepting"]').first().prop('isDisabled'));
            });

            it('should be enabled if last image is acceptable', () => {
                const image = {stateName: 'some-name', status: FAIL};
                const initialState = {
                    tree: {
                        images: {
                            byId: {'img-id': image},
                            stateById: {'img-id': {shouldBeOpened: true}}
                        }
                    }
                };
                utilsStub.isAcceptable.withArgs(image).returns(true);
                getLastImageByStateName.returns(image);

                const stateComponent = mkStateComponent({imageId: 'img-id'}, initialState);

                assert.isFalse(stateComponent.find('[title="Open mode with fast screenshot accepting"]').first().prop('isDisabled'));
            });

            it('should call "openModal" action on button click', () => {
                const image = {stateName: 'some-name', status: FAIL};
                const initialState = {
                    tree: {
                        images: {
                            byId: {'img-id': image},
                            stateById: {'img-id': {shouldBeOpened: true}}
                        }
                    }
                };
                utilsStub.isAcceptable.withArgs(image).returns(true);
                getLastImageByStateName.returns(image);

                const stateComponent = mkStateComponent({imageId: 'img-id'}, initialState);
                stateComponent.find('[title="Open mode with fast screenshot accepting"]').first().simulate('click');

                assert.calledOnceWith(actionsStub.openModal, {
                    id: modalTypes.SCREENSHOT_ACCEPTER,
                    type: modalTypes.SCREENSHOT_ACCEPTER,
                    className: 'screenshot-accepter',
                    data: {image}
                });
            });
        });
    });

    describe('"toggleStateResult" action', () => {
        it('should call on click in state name', () => {
            const image = {stateName: 'some-name', status: SUCCESS};
            const initialState = {
                tree: {
                    images: {
                        byId: {'img-id': image},
                        stateById: {'img-id': {shouldBeOpened: false}}
                    }
                },
                view: {expand: EXPAND_ALL}
            };

            const stateComponent = mkStateComponent({imageId: 'img-id'}, initialState);
            stateComponent.find('.state-title').simulate('click');

            assert.calledOnceWith(
                actionsStub.toggleStateResult,
                {imageId: 'img-id', shouldBeOpened: true}
            );
        });
    });
});
