import {
    notify,
    POSITIONS,
    Status as NotificationStatus, Notification
} from 'reapop';

import {getHttpErrorMessage} from '@/static/modules/utils';

type UpsertNotificationAction = ReturnType<typeof notify>;

export const createNotification = (id: string, status: NotificationStatus, message: string, props: Partial<Notification> = {}): UpsertNotificationAction => {
    const notificationProps: Partial<Notification> = {
        position: POSITIONS.topCenter,
        dismissAfter: 5000,
        dismissible: true,
        showDismissButton: true,
        allowHTML: true,
        ...props
    };

    return notify({id, status, message, ...notificationProps});
};

export const createNotificationError = (id: string, error: Error, props: Partial<Notification> = {dismissAfter: 0}): UpsertNotificationAction =>
    createNotification(id, 'error', getHttpErrorMessage(error), props);

export {dismissNotification} from 'reapop';
