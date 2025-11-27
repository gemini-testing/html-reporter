import {Divider, Hotkey} from '@gravity-ui/uikit';
import React, {ReactNode} from 'react';

import {AsidePanel} from '@/static/new-ui/components/AsidePanel';
import {PanelSection} from '@/static/new-ui/components/PanelSection';
import {HOTKEYS_GROUPS} from '@/static/new-ui/components/MainLayout/hotkeys';
import styles from './index.module.css';

export function HotkeysPanel(): ReactNode {
    const sections = HOTKEYS_GROUPS.map((group, groupIndex) => (
        <PanelSection key={groupIndex} title={group.title}>
            <div className={styles.hotkeysList}>
                {group.items.map((item, itemIndex) => (
                    <div key={itemIndex} className={styles.hotkeyItem}>
                        <span className={styles.hotkeyTitle}>{item.title}</span>
                        <Hotkey value={item.value} view="light" />
                    </div>
                ))}
            </div>
        </PanelSection>
    ));

    const lastSection = sections.pop();

    return (
        <AsidePanel title="Keyboard Shortcuts" className={styles.hotkeysPanel}>
            {sections.map((section, index) => (
                <React.Fragment key={index}>
                    {section}
                    <Divider orientation="horizontal" className={styles.divider} />
                </React.Fragment>
            ))}
            {lastSection}
        </AsidePanel>
    );
}

