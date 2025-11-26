import {AsideHeader, MenuItem as GravityMenuItem} from '@gravity-ui/navigation';
import classNames from 'classnames';
import React, {ReactNode, useCallback, useState} from 'react';
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
import {useHotkey} from '@/static/new-ui/hooks/useHotkey';
import {setSectionSizes} from '../../../modules/actions/suites-page';
import {ArrowLeftToLine, ArrowRightFromLine} from '@gravity-ui/icons';
import {Hotkey} from '@gravity-ui/uikit';
import {isSectionHidden} from '../../features/suites/utils';
import {Page, PathNames} from '@/constants';

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

    const pageHotkeys: Record<string, string> = {
        [PathNames.suites]: 's',
        [PathNames.visualChecks]: 'v'
    };

    const menuItems: GravityMenuItem[] = props.pages.map(item => ({
        id: item.url,
        title: item.title,
        tooltipText: <>{item.title} <Hotkey value={pageHotkeys[item.url]} view="dark" /></>,
        icon: item.icon,
        current: Boolean(matchPath(`${item.url.replace(/\/$/, '')}/*`, location.pathname)),
        onItemClick: (): void => {
            analytics?.trackFeatureUsage({featureName: `Go to ${item.url} page`});
            navigate(item.url);
        },
        qa: `${item.url.slice(1)}-page-menu-item`
    }));

    const currentSuitesPageSectionSizes = useSelector(state => state.ui[Page.suitesPage].sectionSizes);
    const backupSuitesPageSectionSizes = useSelector(state => state.ui[Page.suitesPage].backupSectionSizes);
    if (/\/suites/.test(location.pathname)) {
        const shouldExpandTree = isSectionHidden(currentSuitesPageSectionSizes[0]);
        const treeTitle = shouldExpandTree ? 'Expand tree' : 'Collapse tree';
        menuItems.push(
            {id: 'divider', type: 'divider', title: '-'},
            {
                id: 'expand-collapse-tree',
                title: treeTitle,
                tooltipText: <>{treeTitle} <Hotkey value="t" view="dark" /></>,
                icon: shouldExpandTree ? ArrowRightFromLine : ArrowLeftToLine,
                onItemClick: (): void => {
                    dispatch(setSectionSizes({sizes: shouldExpandTree ? backupSuitesPageSectionSizes : [0, 100], page: Page.suitesPage}));
                },
                qa: 'expand-collapse-suites-tree'
            }
        );
    }

    const currentVisualChecksPageSectionSizes = useSelector(state => state.ui[Page.visualChecksPage].sectionSizes);
    const backupVisualChecksPageSectionSizes = useSelector(state => state.ui[Page.visualChecksPage].backupSectionSizes);
    if (/\/visual-checks/.test(location.pathname)) {
        const shouldExpandTree = isSectionHidden(currentVisualChecksPageSectionSizes[0]);
        const treeTitle = shouldExpandTree ? 'Expand tree' : 'Collapse tree';
        menuItems.push(
            {id: 'divider', type: 'divider', title: '-'},
            {
                id: 'expand-collapse-tree',
                title: treeTitle,
                tooltipText: <>{treeTitle} <Hotkey value="t" view="dark" /></>,
                icon: shouldExpandTree ? ArrowRightFromLine : ArrowLeftToLine,
                onItemClick: (): void => {
                    dispatch(setSectionSizes({sizes: shouldExpandTree ? backupVisualChecksPageSectionSizes : [0, 100], page: Page.visualChecksPage}));
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

    const togglePanel = useCallback((panelId: PanelId): void => {
        setVisiblePanel(prev => prev === panelId ? null : panelId);
    }, []);

    const toggleTreeSidebar = useCallback((): void => {
        const isOnSuitesPage = /\/suites/.test(location.pathname);
        const isOnVisualChecksPage = /\/visual-checks/.test(location.pathname);

        if (isOnSuitesPage) {
            const shouldExpand = isSectionHidden(currentSuitesPageSectionSizes[0]);
            dispatch(setSectionSizes({sizes: shouldExpand ? backupSuitesPageSectionSizes : [0, 100], page: Page.suitesPage}));
        } else if (isOnVisualChecksPage) {
            const shouldExpand = isSectionHidden(currentVisualChecksPageSectionSizes[0]);
            dispatch(setSectionSizes({sizes: shouldExpand ? backupVisualChecksPageSectionSizes : [0, 100], page: Page.visualChecksPage}));
        }
    }, [location.pathname, currentSuitesPageSectionSizes, backupSuitesPageSectionSizes, currentVisualChecksPageSectionSizes, backupVisualChecksPageSectionSizes, dispatch]);

    const navigateToSuites = useCallback(() => navigate(PathNames.suites), [navigate]);
    const navigateToVisualChecks = useCallback(() => navigate(PathNames.visualChecks), [navigate]);
    const toggleInfoPanel = useCallback(() => togglePanel(PanelId.Info), [togglePanel]);
    const toggleSettingsPanel = useCallback(() => togglePanel(PanelId.Settings), [togglePanel]);

    useHotkey('s', navigateToSuites);
    useHotkey('v', navigateToVisualChecks);
    useHotkey('t', toggleTreeSidebar);
    useHotkey('i', toggleInfoPanel);
    useHotkey(',', toggleSettingsPanel);

    return <AsideHeader
        className={classNames({'aside-header--initialized': isInitialized})}
        logo={{text: 'Testplane UI', iconSrc: TestplaneIcon, iconSize: 32, onClick: () => navigate(PathNames.suites)}}
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
