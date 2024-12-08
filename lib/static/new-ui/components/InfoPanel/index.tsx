import {Server, Database} from '@gravity-ui/icons';
import {Divider} from '@gravity-ui/uikit';
import {isEmpty} from 'lodash';
import React, {ReactNode} from 'react';
import {useSelector} from 'react-redux';

import {AsidePanel} from '@/static/new-ui/components/AsidePanel';
import {DataSourceItem} from '@/static/new-ui/components/InfoPanel/DataSourceItem';
import {PanelSection} from '@/static/new-ui/components/PanelSection';
import styles from './index.module.css';
import {version} from '../../../../../package.json';

export function InfoPanel(): ReactNode {
    const isGui = useSelector(state => state.gui);
    const extraItems = Object.entries(useSelector(state => state.apiValues.extraItems));

    const sections: ReactNode[] = [];

    if (extraItems.length > 0) {
        sections.push(<PanelSection title={'Links'} description={'Project-specific links and actions. Configure what you see here via extraItems API.'}>
            <ul className={styles.extraItemsList}>
                {extraItems.map((item, index) => (<li key={index}><a href={item[1]}>{item[0]}</a></li>))}
            </ul>
        </PanelSection>);
    }

    sections.push(<PanelSection
        title={'Testplane UI v' + version}
        description={<span>To get the most out of Testplane UI, try to keep it updated to the latest version. Check out fresh <a href={'https://github.com/gemini-testing/html-reporter/releases'}>releases on GitHub</a>.</span>}
    />);

    const timestamp = useSelector(state => state.timestamp);
    const lang = isEmpty(navigator.languages) ? navigator.language : navigator.languages[0];
    const date = new Date(timestamp).toLocaleString(lang);
    if (!isGui) {
        sections.push(<PanelSection
            title={'Created at ' + date}
            description={'Date and time when this report was generated. Report generates once all tests finish running.'}
        />);
    }

    const isConnectedToGuiServer = useSelector(state => state.app.guiServerConnection.isConnected);
    const dbDetails = useSelector(state => state.fetchDbDetails);
    sections.push(<PanelSection
        title={'Data sources'}
        description={'To display test run data, Testplane UI needs access to corresponding data sources.'}
    >
        <div>
            <div className={styles.dataSourceHeading}>
                <span>Source</span><span>Status</span>
            </div>
            <div className={styles.dataSourceList}>
                {isGui && <DataSourceItem icon={Server} title={'Testplane UI Server'} success={isConnectedToGuiServer}/>}
                {!isGui && dbDetails.map(({url, success, status}, index) => <DataSourceItem key={index} icon={Database} title={url} url={url} success={success} statusCode={status}/>)}
            </div>
        </div>
    </PanelSection>);

    const lastSection = sections.pop();

    return <AsidePanel title={'Info'} className={styles.infoPanel}>
        {sections.map((section, index) => <React.Fragment key={index}>
            {section}
            <Divider orientation={'horizontal'} className={styles.divider}/>
        </React.Fragment>)}
        {lastSection}
    </AsidePanel>;
}
