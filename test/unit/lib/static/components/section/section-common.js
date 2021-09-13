import React from 'react';
import {defaults} from 'lodash';
import proxyquire from 'proxyquire';
import LazilyRender from '@gemini-testing/react-lazily-render';
import {FAIL, SUCCESS} from 'lib/constants/test-statuses';
import {mkConnectedComponent} from '../utils';
import {mkSuite, mkStateTree} from '../../state-utils';

describe('<SectionCommon/>', () => {
    const sandbox = sinon.sandbox.create();
    let SectionCommon, Title, SectionBrowser, actionsStub;

    const mkSectionCommonComponent = (props = {}, initialState = {}) => {
        props = defaults(props, {
            suiteId: 'default-suite-id',
            eventToUpdate: ''
        });
        initialState = defaults(initialState, {
            tree: mkStateTree()
        });

        return mkConnectedComponent(<SectionCommon {...props} />, {initialState});
    };

    beforeEach(() => {
        SectionBrowser = sandbox.stub().returns(null);
        Title = sandbox.stub().returns(null);
        actionsStub = {toggleSuiteSection: sandbox.stub().returns({type: 'some-type'})};

        SectionCommon = proxyquire('lib/static/components/section/section-common', {
            '../../modules/actions': actionsStub,
            './section-browser': {default: SectionBrowser},
            './title/simple': {default: Title}
        }).default;
    });

    afterEach(() => sandbox.restore());

    it('should not render browser section if suite is closed', () => {
        const suitesById = mkSuite({id: 'suite-1', name: 'suite', status: SUCCESS});
        const suitesStateById = {'suite-1': {shouldBeShown: true, shouldBeOpened: false}};
        const tree = mkStateTree({suitesById, suitesStateById});

        mkSectionCommonComponent({suiteId: 'suite-1', sectionRoot: true}, {tree});

        assert.notCalled(SectionBrowser);
    });

    it('should render browser section if suite is opened', () => {
        const suitesById = mkSuite({id: 'suite-1', name: 'suite', status: FAIL, browserIds: ['bro-1']});
        const suitesStateById = {'suite-1': {shouldBeShown: true, shouldBeOpened: true}};
        const tree = mkStateTree({suitesById, suitesStateById});

        mkSectionCommonComponent({suiteId: 'suite-1', sectionRoot: true}, {tree});

        assert.calledOnceWith(SectionBrowser, {browserId: 'bro-1'});
    });

    describe('lazy renderer', () => {
        it('should not wrap root suite if "lazyLoadOffset" is disabled', () => {
            const suitesById = mkSuite({id: 'suite-1'});
            const suitesStateById = {'suite-1': {shouldBeShown: true, shouldBeOpened: false}};
            const tree = mkStateTree({suitesById, suitesStateById});

            const component = mkSectionCommonComponent(
                {suiteId: 'suite-1', sectionRoot: true},
                {tree, view: {lazyLoadOffset: 0}}
            );

            assert.lengthOf(component.find(LazilyRender), 0);
        });

        describe('if "lazyLoadOffset" is enabled', () => {
            it('should wrap only root suite if "lazyLoadOffset" is enabled', () => {
                const suitesById = {
                    ...mkSuite({id: 'suite-1', suiteIds: ['suite-2']}),
                    ...mkSuite({id: 'suite-2', browserIds: ['bro-1']})
                };
                const suitesStateById = {
                    'suite-1': {shouldBeShown: true, shouldBeOpened: true},
                    'suite-2': {shouldBeShown: true, shouldBeOpened: true}
                };
                const tree = mkStateTree({suitesById, suitesStateById});

                const component = mkSectionCommonComponent(
                    {suiteId: 'suite-1', sectionRoot: true},
                    {tree, view: {lazyLoadOffset: 100500}}
                );

                assert.lengthOf(component.find(LazilyRender), 1);
            });

            it('should pass "offset" prop to lazy wrapper', () => {
                const suitesById = mkSuite({id: 'suite-1'});
                const suitesStateById = {'suite-1': {shouldBeShown: true, shouldBeOpened: false}};
                const tree = mkStateTree({suitesById, suitesStateById});

                const component = mkSectionCommonComponent(
                    {suiteId: 'suite-1', sectionRoot: true},
                    {tree, view: {lazyLoadOffset: 100500}}
                );
                const lazyOffset = component.find(LazilyRender).prop('offset');

                assert.equal(lazyOffset, 100500);
            });

            it('should pass "eventToUpdate" prop to lazy wrapper', () => {
                const suitesById = mkSuite({id: 'suite-1'});
                const suitesStateById = {'suite-1': {shouldBeShown: true, shouldBeOpened: false}};
                const tree = mkStateTree({suitesById, suitesStateById});

                const component = mkSectionCommonComponent(
                    {suiteId: 'suite-1', sectionRoot: true, eventToUpdate: 'update-event'},
                    {tree, view: {lazyLoadOffset: 100500}}
                );
                const lazyEventToUpdate = component.find(LazilyRender).prop('eventToUpdate');

                assert.equal(lazyEventToUpdate, 'update-event');
            });

            it('should pass "eventToReset" prop to lazy wrapper', () => {
                const suitesById = mkSuite({id: 'suite-1'});
                const suitesStateById = {'suite-1': {shouldBeShown: true, shouldBeOpened: false}};
                const tree = mkStateTree({suitesById, suitesStateById});

                const component = mkSectionCommonComponent(
                    {suiteId: 'suite-1', sectionRoot: true, eventToReset: 'reset-event'},
                    {tree, view: {lazyLoadOffset: 100500}}
                );
                const lazyEventToUpdate = component.find(LazilyRender).prop('eventToReset');

                assert.equal(lazyEventToUpdate, 'reset-event');
            });

            it('should not render section if it is outside viewport', () => {
                const suitesById = mkSuite({id: 'suite-1'});
                const suitesStateById = {'suite-1': {shouldBeShown: true, shouldBeOpened: false}};
                const tree = mkStateTree({suitesById, suitesStateById});

                const component = mkSectionCommonComponent(
                    {suiteId: 'suite-1', sectionRoot: true, eventToUpdate: 'some-event'},
                    {tree, view: {lazyLoadOffset: 100500}}
                );
                const lazy = component.find(LazilyRender);
                const section = lazy.invoke('children')(false);

                assert.isNull(section);
            });

            it('should render section if it is inside viewport', () => {
                const suitesById = mkSuite({id: 'suite-1'});
                const suitesStateById = {'suite-1': {shouldBeShown: true, shouldBeOpened: false}};
                const tree = mkStateTree({suitesById, suitesStateById});

                const component = mkSectionCommonComponent(
                    {suiteId: 'suite-1', sectionRoot: true, eventToUpdate: 'some-event'},
                    {tree, view: {lazyLoadOffset: 100500}}
                );
                const lazy = component.find(LazilyRender);
                const section = lazy.invoke('children')(true);

                assert.isNotNull(section);
            });
        });
    });

    describe('"toggleSuiteSection" action', () => {
        it('should call action on call passed handler in <Title /> component', () => {
            const suitesById = mkSuite({id: 'suite-1', name: 'suite', status: SUCCESS});
            const suitesStateById = {'suite-1': {shouldBeShown: true, shouldBeOpened: false}};
            const tree = mkStateTree({suitesById, suitesStateById});

            mkSectionCommonComponent({suiteId: 'suite-1', sectionRoot: true}, {tree});
            Title.getCall(0).args[0].handler();

            assert.calledOnceWith(actionsStub.toggleSuiteSection, {suiteId: 'suite-1', shouldBeOpened: true});
        });
    });
});
