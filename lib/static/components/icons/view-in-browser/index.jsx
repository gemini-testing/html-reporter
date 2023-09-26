import React, {Component} from 'react';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import * as actions from '../../../modules/actions';
import {getUrlWithBase} from '../../../../common-utils';

import './index.styl';

class ViewInBrowser extends Component {
    static propTypes = {
        resultId: PropTypes.string.isRequired,
        extendClassNames: PropTypes.oneOfType([PropTypes.array, PropTypes.string]),
        // from store
        suiteUrl: PropTypes.string,
        baseHost: PropTypes.string
    };

    onViewInBrowser = (e) => {
        e.stopPropagation();

        this.props.actions.viewInBrowser();
    };

    render() {
        const {suiteUrl, baseHost, extendClassNames} = this.props;
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
                href={getUrlWithBase(suiteUrl, baseHost)}
                onClick={this.onViewInBrowser}
                title="view in browser"
                target="_blank"
                data-test-id='view-in-browser'
            />
        );
    }
}

export default connect(
    ({tree, view}, {resultId}) => {
        return {
            suiteUrl: tree.results.byId[resultId].suiteUrl,
            baseHost: view.baseHost
        };
    },
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(ViewInBrowser);
