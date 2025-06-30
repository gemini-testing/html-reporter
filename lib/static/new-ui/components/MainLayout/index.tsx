import {AsideHeader, MenuItem as GravityMenuItem} from '@gravity-ui/navigation';
import classNames from 'classnames';
import React, {ReactNode, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {matchPath, useLocation, useNavigate} from 'react-router-dom';

import {getIsInitialized} from '@/static/new-ui/store/selectors';
import {SettingsPanel} from '@/static/new-ui/components/SettingsPanel';
import TestplaneIcon from '../../../icons/testplane-mono.svg';
import styles from './index.module.css';
import {Footer} from './Footer';
import {EmptyReportCard} from '@/static/new-ui/components/Card/EmptyReportCard';
import {InfoPanel} from '@/static/new-ui/components/InfoPanel';
import {useAnalytics} from '@/static/new-ui/hooks/useAnalytics';
import {setSectionSizes} from '../../../modules/actions/suites-page';
import {ArrowLeftToLine, ArrowRightFromLine} from '@gravity-ui/icons';
import {isSectionHidden} from '../../features/suites/utils';
import {Pages} from '@/static/new-ui/types/store';

export enum PanelId {
    Settings = 'settings',
    Info = 'info',
}

interface MenutItemPage {
    title: string;
    url: string;
    icon: GravityMenuItem['icon'];
}

export interface MainLayoutProps {
    children: React.ReactNode;
    pages: MenutItemPage[];
}

export function MainLayout(props: MainLayoutProps): ReactNode {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const analytics = useAnalytics();

    const menuItems: GravityMenuItem[] = props.pages.map(item => ({
        id: item.url,
        title: item.title,
        icon: item.icon,
        current: Boolean(matchPath(`${item.url.replace(/\/$/, '')}/*`, location.pathname)),
        onItemClick: (): void => {
            analytics?.trackFeatureUsage({featureName: `Go to ${item.url} page`});
            navigate(item.url);
        }
    }));

    const currentSuitesPageSectionSizes = useSelector(state => state.ui[Pages.suitesPage].sectionSizes);
    const backupSuitesPageSectionSizes = useSelector(state => state.ui[Pages.suitesPage].backupSectionSizes);
    if (/\/suites/.test(location.pathname)) {
        const shouldExpandTree = isSectionHidden(currentSuitesPageSectionSizes[0]);
        menuItems.push(
            {id: 'divider', type: 'divider', title: '-'},
            {
                id: 'expand-collapse-tree',
                title: shouldExpandTree ? 'Expand tree' : 'Collapse tree',
                icon: shouldExpandTree ? ArrowRightFromLine : ArrowLeftToLine,
                onItemClick: (): void => {
                    dispatch(setSectionSizes({sizes: shouldExpandTree ? backupSuitesPageSectionSizes : [0, 100], page: Pages.suitesPage}));
                },
                qa: 'expand-collapse-suites-tree'
            }
        );
    }

    const currentVisualChecksPageSectionSizes = useSelector(state => state.ui[Pages.visualChecksPage].sectionSizes);
    const backupVisualChecksPageSectionSizes = useSelector(state => state.ui[Pages.visualChecksPage].backupSectionSizes);
    if (/\/visual-checks/.test(location.pathname)) {
        const shouldExpandTree = isSectionHidden(currentVisualChecksPageSectionSizes[0]);
        menuItems.push(
            {id: 'divider', type: 'divider', title: '-'},
            {
                id: 'expand-collapse-tree',
                title: shouldExpandTree ? 'Expand tree' : 'Collapse tree',
                icon: shouldExpandTree ? ArrowRightFromLine : ArrowLeftToLine,
                onItemClick: (): void => {
                    dispatch(setSectionSizes({sizes: shouldExpandTree ? backupVisualChecksPageSectionSizes : [0, 100], page: Pages.visualChecksPage}));
                },
                qa: 'expand-collapse-visual-checks'
            }
        );
    }

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
        menuItems={menuItems}
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
