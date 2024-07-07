import React from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import {isEmpty} from 'lodash';
import Details from '../../../details';

import './index.styl';

const History = ({history}) => (
    isEmpty(history)
        ? null
        : <Details
            title='History'
            content={history}
            extendClassNames='details_type_text history'
        />
);

History.propTypes = {
    resultId: PropTypes.string.isRequired,
    // from store
    history: PropTypes.arrayOf(PropTypes.string)
};

export default connect(({tree}, {resultId}) => {
    const {history = []} = tree.results.byId[resultId];
    console.log(history);
    return {history};
})(History);
