import React, {Component} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import {isEmpty} from 'lodash';
import State from '../../state';
import {isSuccessStatus, isErrorStatus, isSkippedStatus} from '../../../../common-utils';

class Tabs extends Component {
    static propTypes = {
        result: PropTypes.shape({
            id: PropTypes.string.isRequired,
            status: PropTypes.string.isRequired,
            imageIds: PropTypes.array.isRequired,
            screenshot: PropTypes.bool.isRequired,
            error: PropTypes.object
        }).isRequired
    };

    _shouldAddErrorTab() {
        const {result} = this.props;

        return isErrorStatus(result.status);
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
            if (isSuccessStatus(result.status)) {
                return null;
            }
            if (isSkippedStatus(result.status) && isEmpty(result.error)) {
                return null;
            }

            return this._drawTab({key: errorTabId});
        }

        const tabs = result.imageIds.map((imageId) => this._drawTab({key: imageId, imageId}));

        return this._shouldAddErrorTab()
            ? tabs.concat(this._drawTab({key: errorTabId}))
            : tabs;
    }
}

export default connect(
    ({tree}, {result}) => {
        const filteredResult = {...result};
        filteredResult.imageIds = filteredResult.imageIds.filter(imageId => tree.images.byId[imageId].stateName);

        return {result: filteredResult};
    }
)(Tabs);
