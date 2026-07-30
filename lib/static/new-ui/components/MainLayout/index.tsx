import {AsideHeader, MenuItem as GravityMenuItem} from '@gravity-ui/navigation';
import classNames from 'classnames';
import React, {ReactNode, useCallback, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {matchPath, useLocation, useNavigate} from 'react-router-dom';

import {getIsInitialized} from '@/static/new-ui/store/selectors';
import {SettingsPanel} from '@/static/new-ui/components/SettingsPanel';
import {HotkeysPanel} from '@/static/new-ui/components/HotkeysPanel';
import TestplaneIcon from '../../../icons/testplane-mono.svg';
import TreeFull from '@/static/icons/TreeFull';
import TreeHide from '@/static/icons/TreeHide';
import TreeShow from '@/static/icons/TreeShow';
import styles from './index.module.css';
import {Footer} from './Footer';
import {EmptyReportCard} from '@/static/new-ui/components/Card/EmptyReportCard';
import {InfoPanel} from '@/static/new-ui/components/InfoPanel';
import {useAnalytics} from '@/static/new-ui/hooks/useAnalytics';
import {useHotkey} from '@/static/new-ui/hooks/useHotkey';
import {setSectionSizes} from '../../../modules/actions/suites-page';
import {Hotkey} from '@gravity-ui/uikit';

import {Page, PathNames} from '@/constants';

export enum PanelId {
    Hotkeys = 'hotkeys',
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

    const currentVisualChecksPageSectionSizes = useSelector(state => state.ui[Page.visualChecksPage].sectionSizes);
    const backupVisualChecksPageSectionSizes = useSelector(state => state.ui[Page.visualChecksPage].backupSectionSizes);

    const isOnSuitesPage = /\/suites/.test(location.pathname);
    const isOnVisualChecksPage = /\/visual-checks/.test(location.pathname);

    const activePage = isOnSuitesPage ? Page.suitesPage : Page.visualChecksPage;
    const activeSectionSizes = isOnSuitesPage ? currentSuitesPageSectionSizes : currentVisualChecksPageSectionSizes;
    const activeBackupSectionSizes = isOnSuitesPage ? backupSuitesPageSectionSizes : backupVisualChecksPageSectionSizes;

    const treeControls = [
        {id: 'divider', type: 'divider', title: '-'} as GravityMenuItem,
        {
            id: 'tree-full',
            title: 'Tree Only',
            tooltipText: <>Tree Only <Hotkey value="t" view="dark" /></>,
            icon: TreeFull,
            onItemClick: (): void => {
                dispatch(setSectionSizes({sizes: [100, 0], page: activePage}));
            },
            current: activeSectionSizes[0] > 99,
            qa: 'tree-full'
        },
        {
            id: 'tree-show',
            title: 'Tree and Details',
            tooltipText: <>Tree and Details <Hotkey value="t" view="dark" /></>,
            icon: TreeShow,
            onItemClick: (): void => {
                dispatch(setSectionSizes({sizes: activeBackupSectionSizes, page: activePage}));
            },
            current: activeSectionSizes[0] < 99 && activeSectionSizes[0] > 1,
            qa: 'tree-show'
        },
        {
            id: 'tree-collapse',
            title: 'Details Only',
            tooltipText: <>Details Only <Hotkey value="t" view="dark" /></>,
            icon: TreeHide,
            onItemClick: (): void => {
                dispatch(setSectionSizes({sizes: [0, 100], page: activePage}));
            },
            current: activeSectionSizes[0] < 1,
            qa: 'tree-collapse'
        }
    ];

    menuItems.push(...treeControls);

    console.log('DEBUG ', activeSectionSizes);

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
        if (!isOnSuitesPage && !isOnVisualChecksPage) {
            return;
        }
        let sizes: number[];
        if (activeSectionSizes[0] === 100) {
            sizes = activeBackupSectionSizes;
        } else if (activeSectionSizes[0] === 0) {
            sizes = [100, 0];
        } else {
            sizes = [0, 100];
        }
        dispatch(setSectionSizes({sizes, page: activePage}));
    }, [isOnSuitesPage, isOnVisualChecksPage, activePage, activeSectionSizes, activeBackupSectionSizes, dispatch]);

    const navigateToSuites = useCallback(() => navigate(PathNames.suites), [navigate]);
    const navigateToVisualChecks = useCallback(() => navigate(PathNames.visualChecks), [navigate]);
    const toggleHotkeysPanel = useCallback(() => togglePanel(PanelId.Hotkeys), [togglePanel]);
    const toggleInfoPanel = useCallback(() => togglePanel(PanelId.Info), [togglePanel]);
    const toggleSettingsPanel = useCallback(() => togglePanel(PanelId.Settings), [togglePanel]);

    useHotkey('s', navigateToSuites);
    useHotkey('v', navigateToVisualChecks);
    useHotkey('t', toggleTreeSidebar);
    useHotkey('mod+/', toggleHotkeysPanel);
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
            id: PanelId.Hotkeys,
            children: <HotkeysPanel />,
            visible: visiblePanel === PanelId.Hotkeys
        }, {
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
