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
import {State} from '@/static/new-ui/types/store';
import {TextHintCard} from '@/static/new-ui/components/Card/TextHintCard';
import EmptyReport from '../../../icons/empty-report.svg';
import {Check} from '@gravity-ui/icons';
import {Icon} from '@gravity-ui/uikit';

export enum PanelId {
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

export function MainLayout(props: MainLayoutProps): ReactNode {
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

    const browsersById = useSelector((state: State) => state.tree.browsers.byId);
    const isReportEmpty = isInitialized && Object.keys(browsersById).length === 0;

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
        renderContent={(): React.ReactNode => {
            if (isReportEmpty) {
                return <div className={styles.hintCardContainer}>
                    <TextHintCard className={styles.hintCard}>
                        <img src={EmptyReport} alt='icon' className={styles.hintCardIcon}/>
                        <span className={classNames('text-header-1', styles.hintCardTitle)}>This report is empty</span>
                        <div className={styles.hintCardHintsContainer}>
                            {[
                                'Check if your project contains any tests',
                                'Check if the tool you are using is configured correctly and is able to find your tests',
                                'Check logs to see if some critical error has occurred and prevented report from collecting any results'
                            ].map((hintText, index) => <div key={index} className={styles.hintCardHint}><Icon data={Check} className={styles.hintCardCheck}/><div className={styles.hintCardHintText}>{hintText}</div></div>)}
                        </div>
                    </TextHintCard>
                </div>;
            }

            return props.children;
        }}
        hideCollapseButton={true}
        renderFooter={(): ReactNode => <Footer visiblePanel={visiblePanel} onFooterItemClick={onFooterItemClick}/>}
        panelItems={[{
            id: PanelId.Settings,
            children: <SettingsPanel />,
            visible: visiblePanel === PanelId.Settings
        }]}
        onClosePanel={(): void => setVisiblePanel(null)}
    />;
}
