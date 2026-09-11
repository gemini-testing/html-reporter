import React from 'react';

export const WordWrapIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns={'http://www.w3.org/2000/svg'} width={16} height={16} fill={'none'} viewBox={'0 0 16 16'} {...props}>
        <path
            fill={'currentColor'}
            fillRule={'evenodd'}
            clipRule={'evenodd'}
            d={'M1.25 3.25A.75.75 0 0 1 2 2.5h12A.75.75 0 0 1 14 4H2a.75.75 0 0 1-.75-.75M2 7.25a.75.75 0 0 0 0 1.5h9a.75.75 0 0 0 0-1.5zm0 4.75a.75.75 0 0 0 0 1.5h4.75a.75.75 0 0 0 0-1.5z'}
        />
        <path
            fill={'currentColor'}
            d={'m9.5 10.5-2.5 2.25L9.5 15v-1.5h2.25a2.75 2.75 0 0 0 0-5.5H11v1.5h.75a1.25 1.25 0 0 1 0 2.5H9.5z'}
        />
    </svg>
);
