import {AsideHeader, MenuItem as GravityMenuItem} from '@gravity-ui/navigation';
import classNames from 'classnames';
import React, {ReactNode, useMemo, useState} from 'react';
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
import {setSectionSizes} from '@/static/modules/actions';
import {ArrowLeftToLine, ArrowRightFromLine, PlugConnection} from '@gravity-ui/icons';
import {isSectionHidden} from '../../features/suites/utils';
import {PluginPanel} from '@/static/new-ui/features/plugins/components/PluginPanel';
import {useExtensionPoint} from '@/static/new-ui/features/plugins/hooks/useExtensionPoint';
import {ExtensionPointName} from '@/static/new-ui/features/plugins/types';

export enum PanelIdStatic {
    Settings = 'settings',
    Info = 'info',
}

export type PluginPanelId = `plugin-${string}`;

export type PanelId = PanelIdStatic | PluginPanelId;

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

    const plugins = useExtensionPoint(ExtensionPointName.Menu);

    const [visiblePanel, setVisiblePanel] = useState<PanelId | null>(null);

    const onFooterItemClick = (item: Pick<GravityMenuItem, 'id'>): void => {
        if (visiblePanel === item.id) {
            setVisiblePanel(null);
        } else {
            setVisiblePanel(item.id as PanelId);
            analytics?.trackFeatureUsage({featureName: `Open ${item.id} panel`});
        }
    };

    const currentSuitesPageSectionSizes = useSelector(state => state.ui.suitesPage.sectionSizes);
    const backupSuitesPageSectionSizes = useSelector(state => state.ui.suitesPage.backupSectionSizes);

    const menuItems: GravityMenuItem[] = useMemo(() => {
        const mainPages = props.pages.map(item => ({
            id: item.url,
            title: item.title,
            icon: item.icon,
            current: Boolean(matchPath(`${item.url.replace(/\/$/, '')}/*`, location.pathname)),
            onItemClick: (): void => {
                analytics?.trackFeatureUsage({featureName: `Go to ${item.url} page`});
                navigate(item.url);
            }
        }));

        const pluginPages = plugins.map(plugin => ({
            id: `plugin-${plugin.name}`,
            title: plugin.PluginComponent.metadata.name ?? plugin.name,
            icon: PlugConnection,
            current: visiblePanel === `plugin-${plugin.name}`,
            onItemClick: () => onFooterItemClick({
                id: `plugin-${plugin.name}`})
        }));

        const extraItems: GravityMenuItem[] = [];

        if (/\/suites/.test(location.pathname)) {
            const shouldExpandTree = isSectionHidden(currentSuitesPageSectionSizes[0]);
            extraItems.push(
                {id: 'divider', type: 'divider', title: '-'},
                {
                    id: 'expand-collapse-tree',
                    title: shouldExpandTree ? 'Expand tree' : 'Collapse tree',
                    icon: shouldExpandTree ? ArrowRightFromLine : ArrowLeftToLine,
                    onItemClick: (): void => {
                        dispatch(setSectionSizes({sizes: shouldExpandTree ? backupSuitesPageSectionSizes : [0, 100]}));
                    },
                    qa: 'expand-collapse-suites-tree'
                }
            );
        }

        return [...mainPages, pluginPages.length > 0 && {id: 'divider', type: 'divider', title: '-'}, ...pluginPages, ...extraItems].filter(Boolean) as GravityMenuItem[];
    }, [props.pages, plugins, location.pathname, visiblePanel, currentSuitesPageSectionSizes, backupSuitesPageSectionSizes]);

    const pluginsPanels = useMemo(() => {
        return plugins.map(plugin => ({
            id: `plugin-${plugin.name}`,
            content: <PluginPanel plugin={plugin}/>,
            visible: visiblePanel === `plugin-${plugin.name}`
        }));
    }, [plugins, visiblePanel]);

    const isInitialized = useSelector(getIsInitialized);

    const browsersById = useSelector(state => state.tree.browsers.byId);
    const isReportEmpty = isInitialized && Object.keys(browsersById).length === 0;

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
            id: PanelIdStatic.Info,
            children: <InfoPanel />,
            visible: visiblePanel === PanelIdStatic.Info
        }, {
            id: PanelIdStatic.Settings,
            children: <SettingsPanel />,
            visible: visiblePanel === PanelIdStatic.Settings
        }, ...pluginsPanels]}
        onClosePanel={(): void => setVisiblePanel(null)}
    />;
}
