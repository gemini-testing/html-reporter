import React, {Component} from 'react';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import PropTypes from 'prop-types';
import LazilyRender from '@gemini-testing/react-lazily-render';
import * as actions from '../../modules/actions';
import SectionWrapper from './section-wrapper';
import SectionBrowser from './section-browser';
import Title from './title/simple';

class SectionCommon extends Component {
    static propTypes = {
        suiteId: PropTypes.string.isRequired,
        eventToUpdate: PropTypes.string,
        eventToReset: PropTypes.string,
        sectionRoot: PropTypes.bool.isRequired,
        // from store
        suiteName: PropTypes.string.isRequired,
        suiteStatus: PropTypes.string.isRequired,
        suiteChildIds: PropTypes.array,
        suiteBrowserIds: PropTypes.array,
        shouldBeShown: PropTypes.bool.isRequired,
        shouldBeOpened: PropTypes.bool.isRequired,
        // from SectionCommonWrapper
        sectionStatusResolver: PropTypes.func.isRequired
    }

    onToggleSection = () => {
        const {eventToUpdate, suiteId, shouldBeOpened} = this.props;

        if (eventToUpdate) {
            window.dispatchEvent(new Event(eventToUpdate));
        }

        this.props.actions.toggleSuiteSection({suiteId, shouldBeOpened: !shouldBeOpened});
    }

    _drawSection() {
        const {
            suiteId,
            suiteName,
            suiteStatus,
            suiteChildIds,
            suiteBrowserIds,
            sectionRoot,
            sectionStatusResolver,
            shouldBeOpened
        } = this.props;

        if (!shouldBeOpened) {
            return (
                <div className={sectionStatusResolver({status: suiteStatus, shouldBeOpened, sectionRoot})}>
                    <Title name={suiteName} suiteId={suiteId} handler={this.onToggleSection} />
                </div>
            );
        }

        const childSuitesTmpl = suiteChildIds && suiteChildIds.map((suiteId) => {
            return <SectionCommonWrapper
                key={suiteId}
                suiteId={suiteId}
                eventToUpdate={this.props.eventToUpdate}
                eventToReset={this.props.eventToReset}
                sectionRoot={false}
            />;
        });

        const browsersTmpl = suiteBrowserIds && suiteBrowserIds.map((browserId) => {
            return <SectionBrowser key={browserId} browserId={browserId} />;
        });

        return (
            <div className={sectionStatusResolver({status: suiteStatus, shouldBeOpened, sectionRoot})}>
                <Title name={suiteName} suiteId={suiteId} handler={this.onToggleSection} />
                <div className="section__body">
                    {childSuitesTmpl}
                    {browsersTmpl}
                </div>
            </div>
        );
    }

    _drawLazySection() {
        const {suiteId, eventToUpdate, eventToReset, lazyLoadOffset} = this.props;

        return <LazilyRender key={suiteId} eventToUpdate={eventToUpdate} eventToReset={eventToReset} offset={lazyLoadOffset}>
            {render => render ? this._drawSection() : null}
        </LazilyRender>;
    }

    render() {
        if (!this.props.shouldBeShown) {
            return null;
        }

        return this.props.lazyLoadOffset > 0
            ? this._drawLazySection()
            : this._drawSection();
    }
}

const SectionCommonWrapper = connect(
    ({tree, view}, {suiteId}) => {
        const suite = tree.suites.byId[suiteId];
        const {shouldBeOpened, shouldBeShown} = tree.suites.stateById[suiteId];

        return {
            lazyLoadOffset: view.lazyLoadOffset,
            suiteName: suite.name,
            suiteStatus: suite.status,
            suiteChildIds: suite.suiteIds,
            suiteBrowserIds: suite.browserIds,
            shouldBeShown,
            shouldBeOpened
        };
    },
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(SectionWrapper(SectionCommon));

export default SectionCommonWrapper;
