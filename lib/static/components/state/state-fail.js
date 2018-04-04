'use strict';

import React, {Component, Fragment} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import Screenshot from './screenshot';

class StateFail extends Component {
    static propTypes = {
        expected: PropTypes.string.isRequired,
        actual: PropTypes.string.isRequired,
        diff: PropTypes.string.isRequired,
        showOnlyDiff: PropTypes.bool.isRequired,
        scaleImagesPressed: PropTypes.bool.isRequired
    }

    render() {
        const {expected, actual, diff} = this.props;
        const className = classNames(
            'image-box__container',
            {'image-box__container_scale': this.props.scaleImagesPressed}
        );

        return (
            <div className={className}>
                {this._drawExpectedAndActual(expected, actual)}
                {this._drawImageBox('Diff', diff)}
            </div>
        );
    }

    _drawExpectedAndActual(expected, actual) {
        if (this.props.showOnlyDiff) {
            return null;
        }

        return (
            <Fragment>
                {this._drawImageBox('Expected', expected)}
                {this._drawImageBox('Actual', actual)}
            </Fragment>
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
    ({view}) => ({
        showOnlyDiff: view.showOnlyDiff,
        scaleImagesPressed: view.scaleImagesPressed
    })
)(StateFail);
