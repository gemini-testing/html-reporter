import React from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import {isEmpty} from 'lodash';
import Details from '../../../details';

import './index.styl';
import {Card, List} from '@gravity-ui/uikit';
import {TestStepKey} from '@/types';

const History = ({history}) => {
    function transformHistoryTreeToNestedArrays(item, level) {
        item[TestStepKey.Name] = `${'\t'.repeat(level)}${item[TestStepKey.Name]}`;

        if (item[TestStepKey.Args] && item[TestStepKey.Args].length > 0) {
            item[TestStepKey.Name] += `(${item[TestStepKey.Args].map(arg => `"${arg}"`).join(', ')})`;
        }

        if (!item[TestStepKey.Children]) {
            return item;
        }

        return [item, ...item[TestStepKey.Children].map(childItem => transformHistoryTreeToNestedArrays(childItem, level + 1))];
    }

    const flatHistory = history.map(item => transformHistoryTreeToNestedArrays(item, 0)).flat(Infinity);

    const renderHistoryItem = (item) => {
        return (
            <div className='history-item'>
                <span className='history-item__name'>{item[TestStepKey.Name]}</span>
                <span className='history-item__time'>{item[TestStepKey.Duration]} ms</span>
            </div>
        );
    };

    return (
        isEmpty(history)
            ? null
            : <Details
                title='History'
                content={
                    <Card className='details__card' view='filled'>
                        <div style={{display: `flex`}}>
                            <List items={flatHistory} renderItem={renderHistoryItem} filterable={false} virtualized={false}/>
                        </div>
                    </Card>
                }
                extendClassNames='history'
            />
    );
};

History.propTypes = {
    resultId: PropTypes.string.isRequired,
    // from store
    history: PropTypes.arrayOf(PropTypes.object)
};

export default connect(({tree}, {resultId}) => {
    const {history = []} = tree.results.byId[resultId];
    return {history};
})(History);
