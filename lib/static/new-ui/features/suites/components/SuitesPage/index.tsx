import {Flex} from '@gravity-ui/uikit';
import React, {ReactNode} from 'react';
import {connect} from 'react-redux';

import {SplitViewLayout} from '@/static/new-ui/components/SplitViewLayout';
import {TestNameFilter} from '@/static/new-ui/features/suites/components/TestNameFilter';
import {SuitesTreeView} from '@/static/new-ui/features/suites/components/SuitesTreeView';
import {TestStatusFilter} from '@/static/new-ui/features/suites/components/TestStatusFilter';

function SuitesPageInternal(): ReactNode {
    return <SplitViewLayout>
        <div>
            <Flex direction={'column'} spacing={{p: '2'}} style={{height: '100vh'}}>
                <h2 className="text-display-1">Suites</h2>
                <Flex>
                    <TestNameFilter/>
                </Flex>
                <Flex spacing={{mt: 2}}>
                    <TestStatusFilter/>
                </Flex>
                <SuitesTreeView/>
            </Flex>
        </div>
        <div></div>
    </SplitViewLayout>;
}

export const SuitesPage = connect()(SuitesPageInternal);
