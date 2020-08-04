import {POSITIONS, reducer} from 'reapop';

const notificationsReducer = reducer({
    position: POSITIONS.topCenter,
    dismissAfter: 5000,
    dismissible: true,
    closeButton: true,
    allowHTML: true
});

export default (state, action) => {
    return {
        ...state,
        notifications: notificationsReducer(state.notifications, action)
    };
};
