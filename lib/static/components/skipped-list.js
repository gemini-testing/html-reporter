'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import Parser from 'html-react-parser';
import classNames from 'classnames';
import {connect} from 'react-redux';

class SkippedList extends Component {
    static propTypes = {
        showSkipped: PropTypes.bool.isRequired,
        skips: PropTypes.array.isRequired
    }

    render() {
        const {showSkipped, skips} = this.props;
        const collapsed = !showSkipped;
        const className = classNames('skipped__list', {collapsed});

        const skipsTmpl = skips.length > 0
            ? this._drawSkips(skips)
            : 'There are no skipped tests';

        return (<div className={className}>{skipsTmpl}</div>);
    }

    _drawSkips(skips) {
        return skips.map((skip, index) => {
            const {browser, comment, suite} = skip;
            return (
                <div key={index}>
                    {suite} > {browser}
                    {comment && ' reason: '}
                    {comment && Parser(comment)}
                </div>
            );
        });
    }
}

export default connect(
    (state) => ({
        showSkipped: state.view.showSkipped,
        skips: state.skips
    })
)(SkippedList);
