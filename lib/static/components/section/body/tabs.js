import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {isEmpty} from 'lodash';
import State from '../../state';
import {isSuccessStatus, isErroredStatus} from '../../../../common-utils';

export default class Tabs extends Component {
    static propTypes = {
        result: PropTypes.shape({
            id: PropTypes.string.isRequired,
            status: PropTypes.string.isRequired,
            imageIds: PropTypes.array.isRequired,
            multipleTabs: PropTypes.bool.isRequired,
            screenshot: PropTypes.bool.isRequired
        }).isRequired
    }

    _shouldAddErrorTab() {
        const {result} = this.props;

        return result.multipleTabs && isErroredStatus(result.status) && !result.screenshot;
    }

    _drawTab({key, imageId = null}) {
        const {result} = this.props;

        return (
            <div key={key} className="tab">
                <div className="tab__item tab__item_active">
                    <State result={result} imageId={imageId} />
                </div>
            </div>
        );
    }

    render() {
        const {result} = this.props;
        const errorTabId = `${result.id}_error`;

        if (isEmpty(result.imageIds)) {
            return isSuccessStatus(result.status)
                ? null
                : this._drawTab({key: errorTabId});
        }

        const tabs = result.imageIds.map((imageId) => this._drawTab({key: imageId, imageId}));

        return this._shouldAddErrorTab()
            ? tabs.concat(this._drawTab({key: errorTabId}))
            : tabs;
    }
}
