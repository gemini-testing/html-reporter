import {Component} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import {areAllRootSuitesIdle} from '../modules/selectors/tree';

const RUNNING_HREF = 'icons/favicon-running.png';
const FAILURE_HREF = 'icons/favicon-failure.png';
const SUCCESS_HREF = 'icons/favicon-success.png';

class FaviconChanger extends Component {
    static propTypes = {
        // from store
        isRunning: PropTypes.bool.isRequired,
        hasFailedRootSuites: PropTypes.bool.isRequired,
        allRootSuitesIdle: PropTypes.bool.isRequired
    }

    constructor(props) {
        super(props);

        this.favicon = document.getElementById('dynamic-favicon');
    }

    _changeFavicon(href) {
        this.favicon.href = href;
    }

    render() {
        const {isRunning, hasFailedRootSuites, allRootSuitesIdle} = this.props;

        if (isRunning) {
            this._changeFavicon(RUNNING_HREF);
        } else if (hasFailedRootSuites) {
            this._changeFavicon(FAILURE_HREF);
        } else if (!allRootSuitesIdle) {
            this._changeFavicon(SUCCESS_HREF);
        }

        return null;
    }
}

export default connect(
    (state) => {
        const hasFailedRootSuites = Boolean(state.tree.suites.failedRootIds.length);
        const allRootSuitesIdle = state.gui
            ? !hasFailedRootSuites && areAllRootSuitesIdle(state)
            : false;

        return {
            isRunning: state.running,
            hasFailedRootSuites,
            allRootSuitesIdle
        };
    }
)(FaviconChanger);
