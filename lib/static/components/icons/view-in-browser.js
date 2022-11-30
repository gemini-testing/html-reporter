import React, {Component} from 'react';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import PropTypes from 'prop-types';
import url from 'url';
import classNames from 'classnames';

import * as actions from '../../modules/actions';

class ViewInBrowser extends Component {
    static propTypes = {
        resultId: PropTypes.string.isRequired,
        extendClassNames: PropTypes.oneOfType([PropTypes.array, PropTypes.string]),
        // from store
        suiteUrl: PropTypes.string.isRequired,
        parsedHost: PropTypes.object.isRequired
    }

    onViewInBrowser = (e) => {
        e.stopPropagation();

        this.props.actions.viewInBrowser();
    }

    _buildUrl(href, host) {
        return host
            ? url.format(Object.assign(url.parse(href), host))
            : href;
    }

    render() {
        const {suiteUrl, parsedHost, extendClassNames} = this.props;
        const className = classNames(
            'button custom-icon custom-icon_view-in-browser',
            extendClassNames
        );

        return (
            <a
                className={className}
                href={this._buildUrl(suiteUrl, parsedHost)}
                onClick={this.onViewInBrowser}
                title="view in browser"
                target="_blank">
            </a>
        );
    }
}

export default connect(
    ({tree, view}, {resultId}) => {
        return {
            suiteUrl: tree.results.byId[resultId].suiteUrl,
            parsedHost: view.parsedHost
        };
    },
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(ViewInBrowser);
