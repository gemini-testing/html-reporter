import React, {ReactNode} from 'react';
import {Screenshot} from '@/static/new-ui/components/Screenshot';
import {ImageFile} from '@/types';
import {CoordBounds} from 'looks-same';

interface OnlyDiffModeProps {
    diff: ImageFile & {diffClusters?: CoordBounds[]};
}

export function OnlyDiffMode(props: OnlyDiffModeProps): ReactNode {
    return <Screenshot image={props.diff} diffClusters={props.diff.diffClusters} />;
}
