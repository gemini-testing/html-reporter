import React, {ReactNode} from 'react';
import {Screenshot} from '@/static/new-ui/components/Screenshot';
import {ImageFile} from '@/types';
import {CoordBounds} from 'looks-same';

interface OnlyDiffModeProps {
    diff: ImageFile & {diffClusters?: CoordBounds[]};
    magnifier?: React.RefObject<HTMLElement | null>;
}

export function OnlyDiffMode(props: OnlyDiffModeProps): ReactNode {
    return <Screenshot containerClassName="image-outline" image={props.diff} diffClusters={props.diff.diffClusters} magnifier={props.magnifier} />;
}
