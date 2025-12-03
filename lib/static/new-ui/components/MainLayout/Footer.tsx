import {Gear, CircleInfo, Keyboard} from '@gravity-ui/icons';
import {FooterItem, MenuItem as GravityMenuItem} from '@gravity-ui/navigation';
import {Hotkey, Icon} from '@gravity-ui/uikit';
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
    const [isHintVisible, setIsHintVisible] = useState<boolean | null>(null);
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

    const isHotkeysCurrent = props.visiblePanel === PanelId.Hotkeys;
    const isInfoCurrent = props.visiblePanel === PanelId.Info;
    const isSettingsCurrent = props.visiblePanel === PanelId.Settings;

    return <>
        <UiModeHintNotification isVisible={isHintVisible} onClose={(): void => setIsHintVisible(false)} />
        <FooterItem compact={false} item={{
            id: PanelId.Hotkeys,
            title: 'Keyboard Shortcuts',
            tooltipText: <>Keyboard Shortcuts <Hotkey value="mod+/" view="dark" /></>,
            onItemClick: props.onFooterItemClick,
            current: isHotkeysCurrent,
            qa: 'footer-item-hotkeys',
            itemWrapper: (params, makeItem) => makeItem({
                ...params,
                icon: <Icon className={classNames({
                    [styles.footerItem]: !isHotkeysCurrent,
                    [styles['footer-item--active']]: isHotkeysCurrent,
                    disabled: !isInitialized
                })} data={Keyboard} />
            })
        }} />
        <FooterItem compact={false} item={{
            id: PanelId.Info,
            title: 'Info',
            tooltipText: <>Info <Hotkey value="i" view="dark" /></>,
            onItemClick: props.onFooterItemClick,
            current: isInfoCurrent,
            qa: 'footer-item-info',
            itemWrapper: (params, makeItem) => makeItem({
                ...params,
                icon: <Icon className={classNames({
                    [styles.footerItem]: !isInfoCurrent,
                    [styles['footer-item--active']]: isInfoCurrent,
                    disabled: !isInitialized
                })} data={CircleInfo} />
            })
        }} />
        <FooterItem compact={false} item={{
            id: PanelId.Settings,
            title: 'Settings',
            tooltipText: <>Settings <Hotkey value="," view="dark" /></>,
            onItemClick: props.onFooterItemClick,
            current: isSettingsCurrent,
            itemWrapper: (params, makeItem) => makeItem({
                ...params,
                icon: <Icon className={classNames({
                    [styles.footerItem]: !isSettingsCurrent,
                    [styles['footer-item--active']]: isSettingsCurrent,
                    disabled: !isInitialized
                })} data={Gear} />
            })
        }} />
    </>;
}
