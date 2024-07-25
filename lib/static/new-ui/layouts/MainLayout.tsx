import {AsideHeader, MenuItem as GravityMenuItem} from '@gravity-ui/navigation';
import React from 'react';
import {useNavigate, matchPath, useLocation} from 'react-router-dom';
import TestplaneIcon from '../../icons/testplane.svg';

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

    return <AsideHeader logo={{text: 'Testplane UI', iconSrc: TestplaneIcon, iconSize: 32, onClick: () => navigate('/')}} compact={true}
        headerDecoration={true} menuItems={gravityMenuItems}
        renderContent={(): React.ReactNode => props.children} hideCollapseButton={true}
    />;
}
