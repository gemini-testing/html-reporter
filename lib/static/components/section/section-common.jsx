import React, {useContext, useLayoutEffect} from 'react';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import PropTypes from 'prop-types';
import * as actions from '../../modules/actions';
import SectionBrowser from './section-browser';
import Title from './title/simple';
import {sectionStatusResolver} from './utils';
import {MeasurementContext} from '../measurement-context';

function SectionCommon(props) {
    const {
        suiteId,
        suiteName,
        suiteStatus,
        suiteChildIds,
        suiteBrowserIds,
        sectionRoot,
        shouldBeOpened,
        shouldBeShown
    } = props;

    const {measure} = useContext(MeasurementContext);

    useLayoutEffect(() => {
        measure?.();
    }, [shouldBeShown, shouldBeOpened]);

    if (!shouldBeShown) {
        return null;
    }

    const onToggleSection = () => {
        const {suiteId, shouldBeOpened} = props;
        props.actions.toggleSuiteSection({suiteId, shouldBeOpened: !shouldBeOpened});
    };

    if (!shouldBeOpened) {
        return (
            <div className={sectionStatusResolver({status: suiteStatus, shouldBeOpened, sectionRoot})}>
                <Title name={suiteName} suiteId={suiteId} handler={onToggleSection} />
            </div>
        );
    }

    const childSuitesTmpl = suiteChildIds && suiteChildIds.map((suiteId) => {
        // eslint-disable-next-line no-use-before-define
        return <SectionCommonConnected
            key={suiteId}
            suiteId={suiteId}
            sectionRoot={false}
        />;
    });

    const browsersTmpl = suiteBrowserIds && suiteBrowserIds.map((browserId) => {
        return <SectionBrowser key={browserId} browserId={browserId} />;
    });

    return (
        <div className={sectionStatusResolver({status: suiteStatus, shouldBeOpened, sectionRoot})}>
            <Title name={suiteName} suiteId={suiteId} handler={onToggleSection} />
            <div className="section__body">
                {childSuitesTmpl}
                {browsersTmpl}
            </div>
        </div>
    );
}

SectionCommon.propTypes = {
    suiteId: PropTypes.string.isRequired,
    sectionRoot: PropTypes.bool.isRequired,
    // from store
    suiteName: PropTypes.string.isRequired,
    suiteStatus: PropTypes.string.isRequired,
    suiteChildIds: PropTypes.array,
    suiteBrowserIds: PropTypes.array,
    shouldBeShown: PropTypes.bool.isRequired,
    shouldBeOpened: PropTypes.bool.isRequired,
    actions: PropTypes.object.isRequired
};

const SectionCommonConnected = connect(
    ({tree}, {suiteId}) => {
        const suite = tree.suites.byId[suiteId];
        const {shouldBeOpened, shouldBeShown} = tree.suites.stateById[suiteId];

        return {
            suiteName: suite.name,
            suiteStatus: suite.status,
            suiteChildIds: suite.suiteIds,
            suiteBrowserIds: suite.browserIds,
            shouldBeShown,
            shouldBeOpened
        };
    },
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(SectionCommon);

export default SectionCommonConnected;
