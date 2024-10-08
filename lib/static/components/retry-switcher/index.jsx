import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {AttemptPickerItem} from '@/static/new-ui/components/AttemptPickerItem';

export default class RetrySwitcher extends Component {
    static propTypes = {
        resultIds: PropTypes.arrayOf(PropTypes.string).isRequired,
        retryIndex: PropTypes.number,
        title: PropTypes.string,
        onChange: PropTypes.func.isRequired
    };

    render() {
        const {resultIds, retryIndex, title, onChange} = this.props;

        if (resultIds.length <= 1) {
            return null;
        }

        return (
            <div className="tab-switcher">
                {resultIds.map((resultId, ind) => {
                    const isActive = ind === retryIndex;

                    return <AttemptPickerItem
                        key={resultId}
                        resultId={resultId}
                        isActive={isActive}
                        title={title}
                        onClick={() => onChange(ind)}
                    />;
                })}
            </div>
        );
    }
}
