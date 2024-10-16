import {Gear} from '@gravity-ui/icons';
import {FooterItem, MenuItem as GravityMenuItem} from '@gravity-ui/navigation';
import {Icon} from '@gravity-ui/uikit';
import classNames from 'classnames';
import React, {ReactNode, useEffect, useState} from 'react';
import {useSelector} from 'react-redux';

import {UiModeHintNotification} from '@/static/new-ui/components/UiModeHintNotification';
import styles from '@/static/new-ui/components/MainLayout/index.module.css';
import {getIsInitialized} from '@/static/new-ui/store/selectors';
import useLocalStorage from '@/static/hooks/useLocalStorage';
import {PanelId} from '@/static/new-ui/components/MainLayout/index';

interface FooterProps {
    visiblePanel: PanelId | null;
    onFooterItemClick: (item: GravityMenuItem) => void;
}

export function Footer(props: FooterProps): ReactNode {
    const isInitialized = useSelector(getIsInitialized);
    const [isHintVisible, setIsHintVisible] = useState<undefined | boolean>(undefined);
    const [wasHintShownBefore, setWasHintShownBefore] = useLocalStorage('ui-mode-hint-shown', false);

    useEffect(() => {
        const hasJustSwitched = new URL(window.location.href).searchParams.get('switched-from-old-ui') === '1';
        if (isInitialized && hasJustSwitched && !wasHintShownBefore) {
            setIsHintVisible(true);
            setWasHintShownBefore(true);

            const timeoutId = setTimeout(() => {
                setIsHintVisible(false);
            }, 20000);

            return () => {
                clearTimeout(timeoutId);
            };
        }

        return;
    }, [isInitialized]);

    useEffect(() => {
        if (isHintVisible && props.visiblePanel) {
            setIsHintVisible(false);
        }
    }, [props.visiblePanel]);

    const isCurrent = props.visiblePanel === PanelId.Settings;

    return <>
        <UiModeHintNotification isVisible={isHintVisible} onClose={(): void => setIsHintVisible(false)} />
        <FooterItem compact={false} item={{
            id: PanelId.Settings,
            title: 'Settings',
            onItemClick: props.onFooterItemClick,
            current: isCurrent,
            itemWrapper: (params, makeItem) => makeItem({
                ...params,
                icon: <Icon className={classNames({
                    [styles.footerItem]: !isCurrent,
                    [styles['footer-item--active']]: isCurrent,
                    disabled: !isInitialized
                })} data={Gear} />
            })
        }} />
    </>;
}
