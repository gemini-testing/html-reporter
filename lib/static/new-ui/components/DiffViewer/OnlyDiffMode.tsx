import React, {ReactNode} from 'react';
import {Screenshot} from '@/static/new-ui/components/Screenshot';
import {ImageFile} from '@/types';
import {CoordBounds} from 'looks-same';

interface OnlyDiffModeProps {
    diff: ImageFile & {diffClusters?: CoordBounds[]};
}

export function OnlyDiffMode(props: OnlyDiffModeProps): ReactNode {
    return <Screenshot src={props.diff.path} size={props.diff.size} diffClusters={props.diff.diffClusters} />;
}
