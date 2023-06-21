import React from 'react';
import {defaults} from 'lodash';
import proxyquire from 'proxyquire';
import {SUCCESS, SKIPPED, ERROR} from 'src/constants/test-statuses';
import {mkConnectedComponent} from '../utils';
import {mkBrowser, mkResult, mkStateTree} from '../../state-utils';

describe('<SectionBrowser/>', () => {
    const sandbox = sinon.sandbox.create();
    let SectionBrowser, Body, actionsStub;

    const mkSectionBrowserComponent = (props = {}, initialState = {}) => {
        props = defaults(props, {
            browserId: 'default-bro-id'
        });
        initialState = defaults(initialState, {
            tree: mkStateTree()
        });

        return mkConnectedComponent(<SectionBrowser {...props} />, {initialState});
    };

    beforeEach(() => {
        Body = sandbox.stub().returns(null);
        actionsStub = {toggleBrowserSection: sandbox.stub().returns({type: 'some-type'})};

        SectionBrowser = proxyquire('src/static/components/section/section-browser', {
            '../../modules/actions': actionsStub,
            './body': {default: Body}
        }).default;
    });

    afterEach(() => sandbox.restore());

    describe('skipped test', () => {
        it('should render "[skipped]" tag in title', () => {
            const browsersById = mkBrowser({id: 'yabro-1', name: 'yabro', resultIds: ['res'], parentId: 'test'});
            const browsersStateById = {'yabro-1': {shouldBeShown: true, shouldBeOpened: false}};
            const resultsById = mkResult({id: 'res', status: SKIPPED});
            const tree = mkStateTree({browsersById, browsersStateById, resultsById});

            const component = mkSectionBrowserComponent({browserId: 'yabro-1'}, {tree});

            assert.equal(component.find('.section__title_skipped').first().text(), `[${SKIPPED}] yabro`);
        });

        it('should render skip reason', () => {
            const browsersById = mkBrowser({id: 'yabro-1', name: 'yabro', resultIds: ['res'], parentId: 'test'});
            const browsersStateById = {'yabro-1': {shouldBeShown: true, shouldBeOpened: false}};
            const resultsById = mkResult({id: 'res', status: SKIPPED, skipReason: 'some-reason'});
            const tree = mkStateTree({browsersById, browsersStateById, resultsById});

            const component = mkSectionBrowserComponent({browserId: 'yabro-1'}, {tree});

            assert.equal(
                component.find('.section__title_skipped').first().text(),
                `[${SKIPPED}] yabro, reason: some-reason`
            );
        });

        it('should not render body even if browser in opened state', () => {
            const browsersById = mkBrowser({id: 'yabro-1', name: 'yabro', resultIds: ['res'], parentId: 'test'});
            const browsersStateById = {'yabro-1': {shouldBeShown: true, shouldBeOpened: true}};
            const resultsById = mkResult({id: 'res', status: SKIPPED});
            const tree = mkStateTree({browsersById, browsersStateById, resultsById});

            mkSectionBrowserComponent({browserId: 'yabro-1'}, {tree});

            assert.notCalled(Body);
        });
    });

    describe('executed test with fails in retries and skip in result', () => {
        it('should render not skipped title', () => {
            const browsersById = mkBrowser(
                {id: 'yabro-1', name: 'yabro', resultIds: ['res-1', 'res-2'], parentId: 'test'}
            );
            const browsersStateById = {'yabro-1': {shouldBeShown: true, shouldBeOpened: true}};
            const resultsById = {
                ...mkResult({id: 'res-1', status: ERROR, error: {}}),
                ...mkResult({id: 'res-2', status: SKIPPED, skipReason: 'some-reason'})
            };

            const tree = mkStateTree({browsersById, browsersStateById, resultsById});

            const component = mkSectionBrowserComponent({browserId: 'yabro-1'}, {tree});

            assert.equal(component.find('.section__title').first().text(), `[${SKIPPED}] yabro, reason: some-reason`);
            assert.isFalse(component.find('.section__title').exists('.section__title_skipped'));
        });

        it('should render body if browser in opened state', () => {
            const browsersById = mkBrowser(
                {id: 'yabro-1', name: 'yabro', resultIds: ['res-1', 'res-2'], parentId: 'test'}
            );
            const browsersStateById = {'yabro-1': {shouldBeShown: true, shouldBeOpened: true}};
            const resultsById = {
                ...mkResult({id: 'res-1', status: ERROR, error: {}}),
                ...mkResult({id: 'res-2', status: SKIPPED})
            };

            const tree = mkStateTree({browsersById, browsersStateById, resultsById});

            mkSectionBrowserComponent({browserId: 'yabro-1'}, {tree});

            assert.calledOnceWith(
                Body,
                {browserId: 'yabro-1', browserName: 'yabro', testName: 'test', resultIds: ['res-1', 'res-2']}
            );
        });
    });

    describe('should render body for executed skipped test', () => {
        it('with error and without retries', () => {
            const browsersById = mkBrowser({id: 'yabro-1', name: 'yabro', resultIds: ['res-1'], parentId: 'test'});
            const browsersStateById = {'yabro-1': {shouldBeShown: true, shouldBeOpened: true}};
            const resultsById = mkResult({id: 'res-1', status: SKIPPED, error: {}});

            const tree = mkStateTree({browsersById, browsersStateById, resultsById});

            mkSectionBrowserComponent({browserId: 'yabro-1'}, {tree});

            assert.calledOnceWith(
                Body, {browserId: 'yabro-1', browserName: 'yabro', testName: 'test', resultIds: ['res-1']}
            );
        });

        it('with existed images and without retries', () => {
            const browsersById = mkBrowser({id: 'yabro-1', name: 'yabro', resultIds: ['res-1'], parentId: 'test'});
            const browsersStateById = {'yabro-1': {shouldBeShown: true, shouldBeOpened: true}};
            const resultsById = mkResult({id: 'res-1', status: SKIPPED, error: {}, imageIds: ['img-1']});

            const tree = mkStateTree({browsersById, browsersStateById, resultsById});

            mkSectionBrowserComponent({browserId: 'yabro-1'}, {tree});

            assert.calledOnceWith(
                Body, {browserId: 'yabro-1', browserName: 'yabro', testName: 'test', resultIds: ['res-1']}
            );
        });
    });

    describe('"toggleBrowserSection" action', () => {
        it('should call on click in browser title of not skipped test', () => {
            const browsersById = mkBrowser({id: 'yabro-1', name: 'yabro', resultIds: ['res-1'], parentId: 'test'});
            const browsersStateById = {'yabro-1': {shouldBeShown: true, shouldBeOpened: false}};
            const resultsById = mkResult({id: 'res-1', status: SUCCESS});

            const tree = mkStateTree({browsersById, browsersStateById, resultsById});

            const component = mkSectionBrowserComponent({browserId: 'yabro-1'}, {tree});
            component.find('.section__title').simulate('click');

            assert.calledOnceWith(actionsStub.toggleBrowserSection, {browserId: 'yabro-1', shouldBeOpened: true});
        });
    });

    describe('<ClipboardButton/>', () => {
        let BrowserTitle;

        beforeEach(() => {
            BrowserTitle = sandbox.stub().returns(null);
            SectionBrowser = proxyquire('src/static/components/section/section-browser', {
                './title/browser': {default: BrowserTitle}
            }).default;
        });

        it('should render "BrowserTitle" with "browserName" for correctly working clipboard button', () => {
            const browsersById = mkBrowser({id: 'yabro', name: 'yabro', resultIds: ['res']});
            const browsersStateById = {'yabro': {shouldBeShown: true, shouldBeOpened: false}};
            const resultsById = mkResult({id: 'res', status: SUCCESS});
            const tree = mkStateTree({browsersById, browsersStateById, resultsById});

            mkSectionBrowserComponent({browserId: 'yabro'}, {tree});

            assert.calledOnceWith(BrowserTitle, {
                browserId: 'yabro', browserName: 'yabro', handler: sinon.match.any,
                lastResultId: 'res', title: 'yabro'
            });
        });
    });
});

