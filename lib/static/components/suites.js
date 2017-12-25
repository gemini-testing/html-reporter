'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {uniqueId} from 'lodash';
import SectionCommon from './section/section-common';

class Suites extends Component {
    static propTypes = {
        viewMode: PropTypes.string.isRequired,
        skips: PropTypes.array
    }

    render() {
        const {suites, viewMode} = this.props;

        return (
            <div className="sections">
                {suites[viewMode].map((suite) => {
                    const key = uniqueId(`${suite.suitePath}-${suite.name}`);
                    return <SectionCommon key={key} suite={suite}/>;
                })}
            </div>
        );
    }
}

export default connect(
    (state) => ({
        viewMode: state.view.viewMode,
        suites: state.suites
    })
)(Suites);
