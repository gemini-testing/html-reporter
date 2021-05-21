import React from 'react';
import {defaults} from 'lodash';
import proxyquire from 'proxyquire';
import {SUCCESS, SKIPPED, ERROR} from 'lib/constants/test-statuses';
import {mkConnectedComponent} from '../utils';

describe('<SectionBrowser/>', () => {
    const sandbox = sinon.sandbox.create();
    let SectionBrowser, Body, selectors, hasBrowserFailedRetries, shouldBrowserBeShown, actionsStub;

    const mkBrowser = (opts) => {
        const browser = defaults(opts, {
            id: 'default-bro-id',
            name: 'default-bro',
            parentId: 'default-test-id',
            resultIds: []
        });

        return {[browser.id]: browser};
    };

    const mkResult = (opts) => {
        const result = defaults(opts, {
            id: 'default-result-id',
            parentId: 'default-bro-id',
            status: SUCCESS,
            imageIds: []
        });

        return {[result.id]: result};
    };

    const mkStateTree = ({browsersById = {}, resultsById = {}} = {}) => {
        return {
            browsers: {byId: browsersById},
            results: {byId: resultsById}
        };
    };

    const mkSectionBrowserComponent = (props = {}, initialState = {}) => {
        props = defaults(props, {
            browserId: 'default-bro-id',
            errorGroupBrowserIds: []
        });
        initialState = defaults(initialState, {
            tree: mkStateTree(),
            view: {expand: 'all'}
        });

        return mkConnectedComponent(<SectionBrowser {...props} />, {initialState});
    };

    beforeEach(() => {
        Body = sandbox.stub().returns(null);
        hasBrowserFailedRetries = sandbox.stub().returns(false);
        shouldBrowserBeShown = sandbox.stub().returns(true);
        selectors = {
            mkHasBrowserFailedRetries: sandbox.stub().returns(hasBrowserFailedRetries),
            mkShouldBrowserBeShown: sandbox.stub().returns(shouldBrowserBeShown)
        };
        actionsStub = {toggleBrowserSection: sandbox.stub().returns({type: 'some-type'})};

        SectionBrowser = proxyquire('lib/static/components/section/section-browser', {
            '../../modules/actions': actionsStub,
            '../../modules/selectors/tree': selectors,
            './body': {default: Body}
        }).default;
    });

    afterEach(() => sandbox.restore());

    describe('skipped test', () => {
        it('should render "[skipped]" tag in title', () => {
            const browsersById = mkBrowser({id: 'yabro-1', name: 'yabro', resultIds: ['res'], parentId: 'test'});
            const resultsById = mkResult({id: 'res', status: SKIPPED});
            const tree = mkStateTree({browsersById, resultsById});

            const component = mkSectionBrowserComponent({browserId: 'yabro-1'}, {tree});

            assert.equal(component.find('.section__title_skipped').first().text(), `[${SKIPPED}] yabro`);
        });

        it('should render skip reason', () => {
            const browsersById = mkBrowser({id: 'yabro-1', name: 'yabro', resultIds: ['res'], parentId: 'test'});
            const resultsById = mkResult({id: 'res', status: SKIPPED, skipReason: 'some-reason'});
            const tree = mkStateTree({browsersById, resultsById});

            const component = mkSectionBrowserComponent({browserId: 'yabro-1'}, {tree});

            assert.equal(
                component.find('.section__title_skipped').first().text(),
                `[${SKIPPED}] yabro, reason: some-reason`
            );
        });

        it('should not render body even if all tests expanded', () => {
            const browsersById = mkBrowser({id: 'yabro-1', name: 'yabro', resultIds: ['res'], parentId: 'test'});
            const resultsById = mkResult({id: 'res', status: SKIPPED});
            const tree = mkStateTree({browsersById, resultsById});

            mkSectionBrowserComponent({browserId: 'yabro-1'}, {tree, view: {expand: 'all'}});

            assert.notCalled(Body);
        });
    });

    describe('executed test with fails in retries and skip in result', () => {
        it('should render not skipped title', () => {
            const browsersById = mkBrowser(
                {id: 'yabro-1', name: 'yabro', resultIds: ['res-1', 'res-2'], parentId: 'test'}
            );
            const resultsById = {
                ...mkResult({id: 'res-1', status: ERROR, error: {}}),
                ...mkResult({id: 'res-2', status: SKIPPED, skipReason: 'some-reason'})
            };

            const tree = mkStateTree({browsersById, resultsById});
            hasBrowserFailedRetries.returns(true);

            const component = mkSectionBrowserComponent({browserId: 'yabro-1'}, {tree});

            assert.equal(component.find('.section__title').first().text(), `[${SKIPPED}] yabro, reason: some-reason`);
            assert.isFalse(component.find('.section__title').exists('.section__title_skipped'));
        });

        it('should not render body if only errored tests expanded', () => {
            const browsersById = mkBrowser(
                {id: 'yabro-1', name: 'yabro', resultIds: ['res-1', 'res-2'], parentId: 'test'}
            );
            const resultsById = {
                ...mkResult({id: 'res-1', status: ERROR, error: {}}),
                ...mkResult({id: 'res-2', status: SKIPPED})
            };

            const tree = mkStateTree({browsersById, resultsById});
            hasBrowserFailedRetries.returns(true);

            mkSectionBrowserComponent({browserId: 'yabro-1'}, {tree, view: {expand: 'errors'}});

            assert.notCalled(Body);
        });

        it('should render body if all tests expanded', () => {
            const browsersById = mkBrowser(
                {id: 'yabro-1', name: 'yabro', resultIds: ['res-1', 'res-2'], parentId: 'test'}
            );
            const resultsById = {
                ...mkResult({id: 'res-1', status: ERROR, error: {}}),
                ...mkResult({id: 'res-2', status: SKIPPED})
            };

            const tree = mkStateTree({browsersById, resultsById});
            hasBrowserFailedRetries.returns(true);

            mkSectionBrowserComponent({browserId: 'yabro-1'}, {tree, view: {expand: 'all'}});

            assert.calledOnceWith(
                Body,
                {browserId: 'yabro-1', browserName: 'yabro', testName: 'test', resultIds: ['res-1', 'res-2']}
            );
        });
    });

    describe('should render body for executed skipped test', () => {
        it('with error and without retries', () => {
            const browsersById = mkBrowser({id: 'yabro-1', name: 'yabro', resultIds: ['res-1'], parentId: 'test'});
            const resultsById = mkResult({id: 'res-1', status: SKIPPED, error: {}});

            const tree = mkStateTree({browsersById, resultsById});
            hasBrowserFailedRetries.returns(false);

            mkSectionBrowserComponent({browserId: 'yabro-1'}, {tree, view: {expand: 'all'}});

            assert.calledOnceWith(
                Body, {browserId: 'yabro-1', browserName: 'yabro', testName: 'test', resultIds: ['res-1']}
            );
        });

        it('with existed images and without retries', () => {
            const browsersById = mkBrowser({id: 'yabro-1', name: 'yabro', resultIds: ['res-1'], parentId: 'test'});
            const resultsById = mkResult({id: 'res-1', status: SKIPPED, error: {}, imageIds: ['img-1']});

            const tree = mkStateTree({browsersById, resultsById});
            hasBrowserFailedRetries.returns(false);

            mkSectionBrowserComponent({browserId: 'yabro-1'}, {tree, view: {expand: 'all'}});

            assert.calledOnceWith(
                Body, {browserId: 'yabro-1', browserName: 'yabro', testName: 'test', resultIds: ['res-1']}
            );
        });
    });

    describe('"toggleBrowserSection" action', () => {
        it('should call on click in browser title of not skipped test', () => {
            const browsersById = mkBrowser({id: 'yabro-1', name: 'yabro', resultIds: ['res-1'], parentId: 'test'});
            const resultsById = mkResult({id: 'res-1', status: SUCCESS});

            const tree = mkStateTree({browsersById, resultsById});

            const component = mkSectionBrowserComponent({browserId: 'yabro-1'}, {tree, view: {expand: 'error'}});
            component.find('.section__title').simulate('click');

            assert.calledOnceWith(actionsStub.toggleBrowserSection, 'yabro-1');
        });
    });
});
