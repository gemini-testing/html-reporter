import React, {Component} from 'react';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import * as actions from '../../../modules/actions';
import {buildUrl} from '../../../../common-utils';

import './index.styl';

class ViewInBrowser extends Component {
    static propTypes = {
        resultId: PropTypes.string.isRequired,
        extendClassNames: PropTypes.oneOfType([PropTypes.array, PropTypes.string]),
        // from store
        suiteUrl: PropTypes.string,
        parsedHost: PropTypes.object
    }

    onViewInBrowser = (e) => {
        e.stopPropagation();

        this.props.actions.viewInBrowser();
    }

    render() {
        const {suiteUrl, parsedHost, extendClassNames} = this.props;
        const className = classNames(
            'fa view-in-browser',
            suiteUrl ? 'fa-eye view-in-browser_active' : 'fa-eye-slash view-in-browser_disabled',
            extendClassNames
        );

        if (!suiteUrl) {
            return <i className={className} aria-hidden="true" />;
        }

        return (
            <a
                className={className}
                href={buildUrl(suiteUrl, parsedHost)}
                onClick={this.onViewInBrowser}
                title="view in browser"
                target="_blank"
            />
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
