import actionNames from '../action-names';
import {dateToLocaleString} from '../utils';

export default (state, action) => {
    switch (action.type) {
        case actionNames.INIT_GUI_REPORT:
        case actionNames.INIT_STATIC_REPORT: {
            const {date} = action.payload;

            return {...state, date: dateToLocaleString(date)};
        }

        default:
            return state;
    }
};
