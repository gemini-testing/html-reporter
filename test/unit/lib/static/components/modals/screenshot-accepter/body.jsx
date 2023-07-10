import React from 'react';
import {defaults} from 'lodash';
import proxyquire from 'proxyquire';
import {mkConnectedComponent} from '../../utils';

describe('<ScreenshotAccepterBody/>', () => {
    const sandbox = sinon.sandbox.create();
    let ScreenshotAccepterBody, ResizedScreenshot, StateFail, isNoRefImageError;

    const mkBrowser = (opts) => {
        const browser = defaults(opts, {
            id: 'default-browser-id',
            parentId: 'default-suite-id',
            name: 'default-browser-name'
        });

        return {[browser.id]: browser};
    };

    const mkResult = (opts) => {
        const result = defaults(opts, {
            id: 'default-result-id',
            parentId: 'default-bro-id'
        });

        return {[result.id]: result};
    };

    const mkImage = (opts) => {
        return defaults(opts, {
            id: 'default-image-id',
            parentId: 'default-result-id',
            actualImg: {},
            error: {}
        });
    };

    const mkStateTree = ({browsersById = {}, resultsById = {}} = {}) => {
        return {
            browsers: {byId: browsersById},
            results: {byId: resultsById}
        };
    };

    const mkBodyComponent = (props = {}, initialState = {}) => {
        props = defaults(props, {
            image: mkImage()
        });
        initialState = defaults(initialState, {
            tree: mkStateTree()
        });

        return mkConnectedComponent(<ScreenshotAccepterBody {...props} />, {initialState});
    };

    beforeEach(() => {
        ResizedScreenshot = sandbox.stub().returns(null);
        StateFail = sandbox.stub().returns(null);
        isNoRefImageError = sandbox.stub().returns(false);

        ScreenshotAccepterBody = proxyquire('lib/static/components/modals/screenshot-accepter/body', {
            '../../state/screenshot/resized': {default: ResizedScreenshot},
            '../../state/state-fail': {default: StateFail},
            '../../../modules/utils': {isNoRefImageError}
        }).default;
    });

    afterEach(() => sandbox.restore());

    it('should render completion information if "image" is not passed', () => {
        const component = mkBodyComponent({image: null});

        assert.equal(
            component.find('.screenshot-accepter__completion-info').text(),
            'All screenshots are accepted. Well done! 🎉'
        );
        assert.isEmpty(component.find('.screenshot-accepter__title'));
    });

    it('should render full title of image state', () => {
        const image = mkImage({id: 'img', parentId: 'res', stateName: 'state'});
        const resultsById = mkResult({id: 'res', parentId: 'bro'});
        const browsersById = mkBrowser({id: 'bro', parentId: 'suite', name: 'yabro'});
        const tree = mkStateTree({browsersById, resultsById});

        const component = mkBodyComponent({image}, {tree});

        assert.equal(
            component.find('.screenshot-accepter__title').text(),
            'suite/yabro/state'
        );
    });

    describe('no reference image error', () => {
        it('should render screenshot with title', () => {
            const image = mkImage({
                id: 'img',
                parentId: 'res',
                stateName: 'state',
                error: {stack: 'NoRefImageError'},
                actualImg: {path: 'some/path', size: {width: 10, height: 20}}
            });
            const resultsById = mkResult({id: 'res', parentId: 'bro'});
            const browsersById = mkBrowser({id: 'bro', parentId: 'suite', name: 'yabro'});
            const tree = mkStateTree({browsersById, resultsById});
            isNoRefImageError.withArgs(image.error).returns(true);

            const component = mkBodyComponent({image}, {tree});

            assert.equal(
                component.find('.image-box__title').text(),
                'No reference image'
            );
            assert.calledOnceWith(ResizedScreenshot, {image: image.actualImg});
        });
    });

    describe('difference in images', () => {
        it('should render "StateFail" component', () => {
            const image = mkImage({id: 'img', parentId: 'res', stateName: 'state'});
            const resultsById = mkResult({id: 'res', parentId: 'bro'});
            const browsersById = mkBrowser({id: 'bro', parentId: 'suite', name: 'yabro'});
            const tree = mkStateTree({browsersById, resultsById});
            isNoRefImageError.returns(false);

            mkBodyComponent({image}, {tree});

            assert.calledOnceWith(StateFail, {image});
        });
    });
});
