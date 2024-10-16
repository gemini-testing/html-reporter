import {Gear} from '@gravity-ui/icons';
import {AsideHeader, FooterItem, MenuItem as GravityMenuItem} from '@gravity-ui/navigation';
import {Icon} from '@gravity-ui/uikit';
import classNames from 'classnames';
import React, {ReactNode, useState} from 'react';
import {useSelector} from 'react-redux';
import {useNavigate, matchPath, useLocation} from 'react-router-dom';

import {getIsInitialized} from '@/static/new-ui/store/selectors';
import {SettingsPanel} from '@/static/new-ui/components/SettingsPanel';
import TestplaneIcon from '../../../icons/testplane-mono.svg';
import styles from './index.module.css';

enum PanelId {
    Settings = 'settings',
}

interface MenuItem {
    title: string;
    url: string;
    icon: GravityMenuItem['icon'];
}

export interface MainLayoutProps {
    children: React.ReactNode;
    menuItems: MenuItem[];
}

export function MainLayout(props: MainLayoutProps): JSX.Element {
    const navigate = useNavigate();
    const location = useLocation();

    const gravityMenuItems: GravityMenuItem[] = props.menuItems.map(item => ({
        id: item.url,
        title: item.title,
        icon: item.icon,
        current: Boolean(matchPath(`${item.url.replace(/\/$/, '')}/*`, location.pathname)),
        onItemClick: () => navigate(item.url)
    }));

    const isInitialized = useSelector(getIsInitialized);

    const [visiblePanel, setVisiblePanel] = useState<PanelId | null>(null);
    const onFooterItemClick = (item: GravityMenuItem): void => {
        visiblePanel ? setVisiblePanel(null) : setVisiblePanel(item.id as PanelId);
    };

    return <AsideHeader
        className={classNames({'aside-header--initialized': isInitialized})}
        logo={{text: 'Testplane UI', iconSrc: TestplaneIcon, iconSize: 32, onClick: () => navigate('/suites')}}
        compact={true}
        headerDecoration={false}
        menuItems={gravityMenuItems}
        customBackground={<div className={styles.asideHeaderBg}/>}
        customBackgroundClassName={styles.asideHeaderBgWrapper}
        renderContent={(): React.ReactNode => props.children}
        hideCollapseButton={true}
        renderFooter={({compact}): ReactNode => {
            const isCurrent = visiblePanel === PanelId.Settings;
            return <>
                <FooterItem compact={compact} item={{
                    id: PanelId.Settings,
                    title: 'Settings',
                    onItemClick: onFooterItemClick,
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
        }}
        panelItems={[{
            id: PanelId.Settings,
            children: <SettingsPanel />,
            visible: visiblePanel === PanelId.Settings
        }]}
        onClosePanel={(): void => setVisiblePanel(null)}
    />;
}
