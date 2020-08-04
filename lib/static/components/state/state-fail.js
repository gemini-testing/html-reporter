'use strict';

import React, {Component, Fragment} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import Screenshot from './screenshot';

class StateFail extends Component {
    static propTypes = {
        image: PropTypes.shape({
            expectedImg: PropTypes.object.isRequired,
            actualImg: PropTypes.object.isRequired,
            diffImg: PropTypes.object.isRequired,
            diffClusters: PropTypes.array
        }).isRequired,
        // from store
        showOnlyDiff: PropTypes.bool.isRequired
    }

    render() {
        const {image: {expectedImg, actualImg, diffImg, diffClusters}} = this.props;

        return (
            <Fragment>
                {this._drawExpectedAndActual(expectedImg, actualImg)}
                {this._drawImageBox('Diff', diffImg, diffClusters)}
            </Fragment>
        );
    }

    _drawExpectedAndActual(expectedImg, actualImg) {
        if (this.props.showOnlyDiff) {
            return null;
        }

        return (
            <Fragment>
                {this._drawImageBox('Expected', expectedImg)}
                {this._drawImageBox('Actual', actualImg)}
            </Fragment>
        );
    }

    _drawImageBox(label, diffImg, diffClusters) {
        return (
            <div className="image-box__image">
                <div className="image-box__title">{label}</div>
                <Screenshot image={diffImg} diffClusters={diffClusters}/>
            </div>
        );
    }
}

export default connect(
    ({view: {showOnlyDiff}}) => ({showOnlyDiff})
)(StateFail);
