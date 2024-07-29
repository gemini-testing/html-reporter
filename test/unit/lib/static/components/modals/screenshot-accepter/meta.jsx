import React from 'react';
import proxyquire from 'proxyquire';
import {mkConnectedComponent} from '../../utils';

describe('<ScreenshotAccepterMeta/>', () => {
    const sandbox = sinon.sandbox.create();
    let ScreenshotAccepterMeta, MetaInfoContent;

    const mkMetaComponent = (props = {}) => {
        return mkConnectedComponent(<ScreenshotAccepterMeta {...props} />);
    };

    beforeEach(() => {
        MetaInfoContent = sandbox.stub().returns(null);

        ScreenshotAccepterMeta = proxyquire('lib/static/components/modals/screenshot-accepter/meta', {
            '../../section/body/meta-info/content': {default: MetaInfoContent}
        }).default;
    });

    afterEach(() => sandbox.restore());

    describe('should not render meta info', () => {
        it('if "showMeta" property is false', () => {
            const component = mkMetaComponent({
                showMeta: false,
                image: {id: 'some-id'}
            });

            assert.isEmpty(component.container.innerHTML);
        });

        it('if "image" property is empty', () => {
            const component = mkMetaComponent({
                showMeta: true,
                image: null
            });

            assert.isEmpty(component.container.innerHTML);
        });
    });
});
