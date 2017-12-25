'use strict';

import React, {Component, Fragment} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import Screenshot from './screenshot';

class StateFail extends Component {
    static propTypes = {
        expected: PropTypes.string.isRequired,
        actual: PropTypes.string.isRequired,
        diff: PropTypes.string.isRequired,
        showOnlyDiff: PropTypes.bool.isRequired
    }

    render() {
        const {expected, actual, diff} = this.props;

        return (
            <Fragment>
                {this._drawExpectedAndActual(expected, actual)}
                {this._drawImageBox('Diff', diff)}
            </Fragment>
        );
    }

    _drawExpectedAndActual(expected, actual) {
        if (this.props.showOnlyDiff) {
            return null;
        }

        return (
            <div className="image-box__exp-with-act">
                {this._drawImageBox('Expected', expected)}
                {this._drawImageBox('Actual', actual)}
            </div>
        );
    }

    _drawImageBox(label, path) {
        return (
            <div className="image-box__image">
                <div className="image-box__title">{label}</div>
                <Screenshot imagePath={path}/>
            </div>
        );
    }
}

export default connect(
    (state) => ({showOnlyDiff: state.view.showOnlyDiff})
)(StateFail);
