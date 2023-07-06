import React from 'react';

import StickyHeaderTemplate from '.';
import Header from '../header';
import ControlButtons from '../controls/report-controls';

const StickyHeader = () => (
    <StickyHeaderTemplate>
        <Header />
        <ControlButtons />
    </StickyHeaderTemplate>
);

export default StickyHeader;
