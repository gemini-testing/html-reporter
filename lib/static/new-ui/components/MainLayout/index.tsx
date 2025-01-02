import {AsideHeader, MenuItem as GravityMenuItem} from '@gravity-ui/navigation';
import classNames from 'classnames';
import React, {ReactNode, useState} from 'react';
import {useSelector} from 'react-redux';
import {useNavigate, matchPath, useLocation} from 'react-router-dom';

import {getIsInitialized} from '@/static/new-ui/store/selectors';
import {SettingsPanel} from '@/static/new-ui/components/SettingsPanel';
import TestplaneIcon from '../../../icons/testplane-mono.svg';
import styles from './index.module.css';
import {Footer} from './Footer';
import {EmptyReportCard} from '@/static/new-ui/components/Card/EmptyReportCard';
import {InfoPanel} from '@/static/new-ui/components/InfoPanel';
import {useAnalytics} from '@/static/new-ui/hooks/useAnalytics';

export enum PanelId {
    Settings = 'settings',
    Info = 'info',
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

export function MainLayout(props: MainLayoutProps): ReactNode {
    const navigate = useNavigate();
    const location = useLocation();
    const analytics = useAnalytics();

    const gravityMenuItems: GravityMenuItem[] = props.menuItems.map(item => ({
        id: item.url,
        title: item.title,
        icon: item.icon,
        current: Boolean(matchPath(`${item.url.replace(/\/$/, '')}/*`, location.pathname)),
        onItemClick: (): void => {
            analytics?.trackFeatureUsage({featureName: `Go to ${item.url} page`});
            navigate(item.url);
        }
    }));

    const isInitialized = useSelector(getIsInitialized);

    const browsersById = useSelector(state => state.tree.browsers.byId);
    const isReportEmpty = isInitialized && Object.keys(browsersById).length === 0;

    const [visiblePanel, setVisiblePanel] = useState<PanelId | null>(null);
    const onFooterItemClick = (item: GravityMenuItem): void => {
        if (visiblePanel === item.id) {
            setVisiblePanel(null);
        } else {
            setVisiblePanel(item.id as PanelId);
            analytics?.trackFeatureUsage({featureName: `Open ${item.id} panel`});
        }
    };

    return <AsideHeader
        className={classNames({'aside-header--initialized': isInitialized})}
        logo={{text: 'Testplane UI', iconSrc: TestplaneIcon, iconSize: 32, onClick: () => navigate('/suites')}}
        compact={true}
        headerDecoration={false}
        menuItems={gravityMenuItems}
        customBackground={<div className={styles.asideHeaderBg}/>}
        customBackgroundClassName={styles.asideHeaderBgWrapper}
        renderContent={(): React.ReactNode => {
            if (isReportEmpty) {
                return <EmptyReportCard />;
            }

            return props.children;
        }}
        hideCollapseButton={true}
        renderFooter={(): ReactNode => <Footer visiblePanel={visiblePanel} onFooterItemClick={onFooterItemClick}/>}
        panelItems={[{
            id: PanelId.Info,
            children: <InfoPanel />,
            visible: visiblePanel === PanelId.Info
        }, {
            id: PanelId.Settings,
            children: <SettingsPanel />,
            visible: visiblePanel === PanelId.Settings
        }]}
        onClosePanel={(): void => setVisiblePanel(null)}
    />;
}
