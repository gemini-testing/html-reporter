import {eventWithTime} from '@rrweb/types';

export type NumberedSnapshot = eventWithTime & {seqNo: number};
