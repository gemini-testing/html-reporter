import React from 'react';
import {defaults} from 'lodash';
import proxyquire from 'proxyquire';
import {FAIL, SUCCESS} from 'src/constants/test-statuses';
import {mkConnectedComponent} from '../utils';
import {mkSuite, mkStateTree} from '../../state-utils';

describe('<SectionCommon/>', () => {
    const sandbox = sinon.sandbox.create();
    let SectionCommon, Title, SectionBrowser, actionsStub;

    const mkSectionCommonComponent = (props = {}, initialState = {}) => {
        props = defaults(props, {
            suiteId: 'default-suite-id'
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

        SectionCommon = proxyquire('src/static/components/section/section-common', {
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
