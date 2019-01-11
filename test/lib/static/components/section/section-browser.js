import React from 'react';
import SectionBrowser from 'lib/static/components/section/section-browser';
import {mkConnectedComponent, mkTestResult_, mkImg_} from '../utils';
import {mkSuite, mkBrowserResult} from '../../../../utils';

const browserName = 'chrome-phone';
const skipReason = 'stub reason';
const skipStatus = 'skipped';

const browserRetries = [
    mkTestResult_({
        error: {
            message: 'messageStub',
            stack: 'stackStub'
        },
        status: 'error'
    })
];

function mkSectionBrowserComponent({name, retries = [], skipReason = null, status = '', initialState}) {
    const browser = mkBrowserResult({
        name,
        result: mkTestResult_({
            skipReason,
            status,
            imagesInfo: [
                {
                    status,
                    error: {
                        message: 'messageStub',
                        stack: 'stackStub'
                    },
                    actualImg: mkImg_()
                }
            ]
        }),
        retries
    });

    const suite = mkSuite({
        browsers: [browser],
        status
    });

    return mkConnectedComponent(
        <SectionBrowser browser={browser} suite={suite} />,
        {initialState}
    );
}

describe('<SectionBrowser/>', () => {
    it('should show "[skipped]" tag in title for skipped test', () => {
        const component = mkSectionBrowserComponent({
            name: browserName,
            status: skipStatus
        });

        assert.equal(
            component
                .find('.section__title')
                .first()
                .text(),
            `[${skipStatus}] ${browserName}`
        );
        assert.lengthOf(component.find('[title="view in browser"]'), 0);
        assert.lengthOf(component.find('.section__body'), 0);
    });

    it('should show reason for skipped test', () => {
        const component = mkSectionBrowserComponent({
            name: browserName,
            skipReason,
            status: skipStatus
        });

        assert.equal(
            component
                .find('.section__title')
                .first()
                .text(),
            `[${skipStatus}] ${browserName}, reason: ${skipReason}`
        );
        assert.lengthOf(component.find('[title="view in browser"]'), 0);
        assert.lengthOf(component.find('.section__body'), 0);
    });

    it('should show button "view in browser" for skipped test with retries', () => {
        const component = mkSectionBrowserComponent({
            name: browserName,
            retries: browserRetries,
            status: skipStatus
        });

        assert.equal(
            component
                .find('.section__title')
                .first()
                .text(),
            `[${skipStatus}] ${browserName}`
        );
        assert.lengthOf(component.find('[title="view in browser"]'), 1);
        assert.lengthOf(component.find('.section__body'), 0);
    });

    it('should show reason for skipped test with retries', () => {
        const component = mkSectionBrowserComponent({
            name: browserName,
            skipReason,
            retries: browserRetries,
            status: skipStatus
        });

        assert.equal(
            component
                .find('.section__title')
                .first()
                .text(),
            `[${skipStatus}] ${browserName}, reason: ${skipReason}`
        );
        assert.lengthOf(component.find('[title="view in browser"]'), 1);
        assert.lengthOf(component.find('.section__body'), 0);
    });

    it('should show attempts for skipped test with retries', () => {
        const component = mkSectionBrowserComponent({
            name: browserName,
            skipReason,
            retries: browserRetries,
            status: skipStatus,
            initialState: {view: {expand: 'all'}}
        });

        assert.equal(
            component
                .find('.section__title')
                .first()
                .text(),
            `[${skipStatus}] ${browserName}, reason: ${skipReason}`
        );
        assert.lengthOf(component.find('[title="view in browser"]'), 1);
        assert.lengthOf(component.find('.section__body'), 1);
    });
});
