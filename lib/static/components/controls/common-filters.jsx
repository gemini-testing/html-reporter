'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import * as actions from '../../modules/actions';
import TestNameFilterInput from './test-name-filter-input';
import StrictMatchFilterInput from './strict-match-filter-input';
import ShowCheckboxesInput from './show-checkboxes-input';
import BrowserList from './browser-list';
import ControlButton from './control-button';
import AcceptOpenedButton from './accept-opened-button';
import {staticImageAccepterPropType} from '../../modules/static-image-accepter';

const CommonFilters = (props) => {
    const onCommitChanges = () => {
        props.actions.staticAccepterOpenConfirm();
    };

    const renderStaticImageAccepterControls = () => {
        const {staticImageAccepter} = props;

        if (!staticImageAccepter.enabled) {
            return null;
        }

        return (
            <div className='static-image-accepter'>
                <AcceptOpenedButton isSuiteContol={true} />
                <ControlButton
                    label={`Commit ${staticImageAccepter.imagesToCommitCount} images`}
                    title="Send request with imagesInfo to 'staticImageAccepter.serviceUrl'"
                    isDisabled={staticImageAccepter.imagesToCommitCount === 0}
                    isSuiteControl={true}
                    handler={onCommitChanges}
                />
            </div>
        );
    };

    return (
        <div className="control-container control-filters">
            <BrowserList
                available={props.browsers}
                selected={props.filteredBrowsers}
                onChange={(list) => props.actions.selectBrowsers({
                    data: list,
                    page: 'suitesPage'
                })}
            />
            <TestNameFilterInput/>
            <StrictMatchFilterInput/>
            {props.gui && <ShowCheckboxesInput/>}
            {renderStaticImageAccepterControls()}
        </div>
    );
};

CommonFilters.propTypes = {
    gui: PropTypes.bool.isRequired,
    browsers: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string,
        versions: PropTypes.arrayOf(PropTypes.string)
    })).isRequired,
    filteredBrowsers: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string,
        versions: PropTypes.arrayOf(PropTypes.string)
    })),
    staticImageAccepter: staticImageAccepterPropType,
    actions: PropTypes.object.isRequired
};

export default connect(
    ({app, browsers, gui, staticImageAccepter}) => ({
        filteredBrowsers: app.suitesPage.filteredBrowsers,
        browsers,
        gui,
        staticImageAccepter
    }),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(CommonFilters);
