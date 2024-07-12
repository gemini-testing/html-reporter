import React from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import {isEmpty} from 'lodash';
import Details from '../../../details';

import './index.styl';
import { List } from '@gravity-ui/uikit';

const History = ({history}) => {
    const renderHistoryItem = (item) => {
        const [name, time] = item.split(" <- ");
        return (
            <div className='history-item'>
                <span className='history-item__name'>{name}</span>
                <span className='history-item__time'>{time}</span>
            </div>
        )
    }
    return (
    isEmpty(history)
        ? null
        : <Details
            type='text'
            title='History'
            content={
                <div style={{display: `flex`}}>
                    <List items={history} renderItem={renderHistoryItem} filterable={false} virtualized={false}/>
                </div>
            }
            extendClassNames='history'
        />
    )
};

History.propTypes = {
    resultId: PropTypes.string.isRequired,
    // from store
    history: PropTypes.arrayOf(PropTypes.string)
};

export default connect(({tree}, {resultId}) => {
    const {history = []} = tree.results.byId[resultId];
    return {history};
})(History);
