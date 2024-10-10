import {AsideHeader, MenuItem as GravityMenuItem} from '@gravity-ui/navigation';
import classNames from 'classnames';
import React from 'react';
import {useSelector} from 'react-redux';
import {useNavigate, matchPath, useLocation} from 'react-router-dom';
import TestplaneIcon from '../../../icons/testplane-mono.svg';
import styles from './index.module.css';
import {getIsInitialized} from '@/static/new-ui/store/selectors';

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
    />;
}
