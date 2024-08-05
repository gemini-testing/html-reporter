import React, {Component} from 'react';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import {Eye, EyeSlash} from '@gravity-ui/icons';

import * as actions from '../../../modules/actions';
import {getRelativeUrl, getUrlWithBase} from '../../../../common-utils';

import './index.styl';

class ViewInBrowser extends Component {
    static propTypes = {
        resultId: PropTypes.string.isRequired,
        extendClassNames: PropTypes.oneOfType([PropTypes.array, PropTypes.string]),
        // from store
        suiteUrl: PropTypes.string,
        baseHost: PropTypes.string,
        actions: PropTypes.object.isRequired
    };

    onViewInBrowser = (e) => {
        e.stopPropagation();

        this.props.actions.viewInBrowser();
    };

    render() {
        const {suiteUrl, baseHost, extendClassNames} = this.props;
        const className = classNames(
            'view-in-browser',
            suiteUrl ? 'view-in-browser_active' : 'view-in-browser_disabled',
            extendClassNames
        );

        if (!suiteUrl) {
            return <i className={className} aria-hidden="true"><EyeSlash color='black'/></i> ;
        }

        return (
            <a
                className={className}
                href={getUrlWithBase(getRelativeUrl(suiteUrl), baseHost)}
                onClick={this.onViewInBrowser}
                title="view in browser"
                target="_blank"
                data-qa='view-in-browser' rel="noreferrer"
            ><Eye color='black'/></a>
        );
    }
}

export default connect(
    ({tree, view}, {resultId}) => {
        const result = tree.results.byId[resultId];

        return {
            suiteUrl: result.metaInfo?.url ?? result.suiteUrl,
            baseHost: view.baseHost
        };
    },
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(ViewInBrowser);
