import React from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import {get, escapeRegExp} from 'lodash';
import * as actions from '../../../modules/actions';
import {appendQuery} from '../../../modules/query-params';
import {ViewMode} from '../../../../constants/view-modes';
import {EXPAND_ALL} from '../../../../constants/expand-modes';
import {getToggledCheckboxState} from '../../../../common-utils';
import ViewInBrowserIcon from '../../icons/view-in-browser';
import Bullet from '../../bullet';
import {ActionTooltip, Button, CopyToClipboard} from '@gravity-ui/uikit';
import {ArrowShapeTurnUpRight} from '@gravity-ui/icons';

const ShareButtonComponent = ({status, ...rest}) => {
    return (
        <ActionTooltip
            title={status === 'success' ? 'Copied' : 'Copy test link'}
        >
            <Button
                size='s'
                view='flat'
                extraProps={{
                    'aria-label': 'Copy test link'
                }}
                {...rest}
            >
                <Button.Icon>
                    <ArrowShapeTurnUpRight width={16} height={16}/>
                </Button.Icon>
            </Button>
        </ActionTooltip>
    );
};

const BrowserTitle = (props) => {
    const testUrl = React.useMemo(() => {
        return appendQuery(window.location.href, {
            browser: escapeRegExp(props.browserName),
            testNameFilter: escapeRegExp(props.testName),
            strictMatchFilter: true,
            retryIndex: props.retryIndex,
            viewModes: ViewMode.ALL,
            expand: EXPAND_ALL
        });
    }, [props.browserName, props.testName, props.retryIndex]);

    const onCopyTestLink = (e) => {
        e.stopPropagation();

        props.actions.copyTestLink();
    };

    const onToggleCheckbox = (e) => {
        e.stopPropagation();

        props.actions.toggleBrowserCheckbox({
            suiteBrowserId: props.browserId,
            checkStatus: getToggledCheckboxState(props.checkStatus)
        });
    };

    return (
        <div className="section__title section__title_type_browser" onClick={props.handler}>
            <Bullet status={props.checkStatus} onClick={onToggleCheckbox} />
            {props.title}
            <ViewInBrowserIcon resultId={props.lastResultId}/>
            <CopyToClipboard text={testUrl} timeout={1000}>
                {(status) => <ShareButtonComponent onClick={onCopyTestLink} status={status}/>}
            </CopyToClipboard>
        </div>
    );
};

BrowserTitle.propTypes = {
    title: PropTypes.node.isRequired,
    browserId: PropTypes.string.isRequired,
    browserName: PropTypes.string.isRequired,
    lastResultId: PropTypes.string.isRequired,
    handler: PropTypes.func.isRequired,
    // from store
    checkStatus: PropTypes.number.isRequired,
    testName: PropTypes.string.isRequired,
    retryIndex: PropTypes.number.isRequired,
    suiteUrl: PropTypes.string
};

export default connect(
    ({tree}, {browserId}) => {
        const browserState = tree.browsers.stateById[browserId];

        return {
            checkStatus: browserState.checkStatus,
            testName: tree.browsers.byId[browserId].parentId,
            retryIndex: get(browserState, 'retryIndex', 0)
        };
    },
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(BrowserTitle);
