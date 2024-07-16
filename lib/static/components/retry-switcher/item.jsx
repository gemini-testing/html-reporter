import React, {Component} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import {connect} from 'react-redux';
import {get} from 'lodash';
import {ERROR} from '../../../constants';
import {
    hasUnrelatedToScreenshotsErrors,
    isFailStatus
} from '../../../common-utils';
import {Button} from '@gravity-ui/uikit';

class RetrySwitcherItem extends Component {
    static propTypes = {
        resultId: PropTypes.string.isRequired,
        isActive: PropTypes.bool.isRequired,
        onClick: PropTypes.func.isRequired,
        title: PropTypes.string,
        // from store
        status: PropTypes.string.isRequired,
        attempt: PropTypes.number.isRequired,
        keyToGroupTestsBy: PropTypes.string.isRequired,
        matchedSelectedGroup: PropTypes.bool.isRequired
    };

    render() {
        const {status, attempt, isActive, onClick, title, keyToGroupTestsBy, matchedSelectedGroup} = this.props;
        const statusToView = {
            success: {
                view: 'flat-success',
                selected: true
            },
            updated: {
                view: 'flat-success',
                selected: true
            },
            error: {
                view: 'flat-danger',
                selected: true
            },
            fail: {
                view: 'flat-utility',
                selected: true
            },
            // eslint-disable-next-line camelcase
            fail_error: {
                view: 'flat-utility',
                selected: true
            },
            skipped: {
                view: 'normal',
                selected: false
            },
            running: {
                view: 'outlined',
                selected: false
            }
        };

        const className = classNames(
            'tab-switcher__button',
            {'tab-switcher__button_active': isActive},
            {[`tab-switcher__button_status_${status}`]: status},
            {'tab-switcher__button_non-matched': keyToGroupTestsBy && !matchedSelectedGroup}
        );

        return <Button {...statusToView[status]} title={title} className={className} onClick={onClick} qa='retry-switcher'>{attempt + 1}</Button>;
    }
}

export default connect(
    ({tree, view: {keyToGroupTestsBy}}, {resultId}) => {
        const result = tree.results.byId[resultId];
        const matchedSelectedGroup = get(tree.results.stateById[resultId], 'matchedSelectedGroup', false);
        const {status, attempt, error} = result;

        return {
            status: isFailStatus(status) && hasUnrelatedToScreenshotsErrors(error) ? `${status}_${ERROR}` : status,
            attempt,
            keyToGroupTestsBy,
            matchedSelectedGroup
        };
    }
)(RetrySwitcherItem);

