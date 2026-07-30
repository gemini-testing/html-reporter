import React from 'react';

const TreeFull: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16" fill="none" {...props}>
        <g clipPath="url(#clip0_2027_6185)">
            <mask id="mask0_2027_6185" maskUnits="userSpaceOnUse" x={0} y={0} width={16} height={16}>
                <path d="M16 0H0V16H16V0Z" fill="currentColor" />
            </mask>
            <g>
                <path fillRule="evenodd" clipRule="evenodd" d="M3 3.5H10.65C10.93 3.5 11.18 3.61 11.36 3.79C11.54 3.97 11.65 4.22 11.65 4.5V11.5C11.65 11.78 11.54 12.03 11.36 12.21C11.18 12.39 10.93 12.5 10.65 12.5H3C2.72 12.5 2.47 12.39 2.29 12.21C2.11 12.03 2 11.78 2 11.5V4.5C2 4.22 2.11 3.97 2.29 3.79C2.47 3.61 2.72 3.5 3 3.5ZM10.65 2H3C2.31 2 1.68 2.28 1.23 2.73C0.78 3.18 0.5 3.81 0.5 4.5V11.5C0.5 12.19 0.78 12.82 1.23 13.27C1.68 13.72 2.31 14 3 14H10.65C11.34 14 11.97 13.72 12.42 13.27C12.87 12.82 13.15 12.19 13.15 11.5V8V4.5C13.15 3.81 12.87 3.18 12.42 2.73C11.97 2.28 11.34 2 10.65 2Z" fill="currentColor"/>
            </g>
            <path d="M14.7002 13.1701V2.83008" stroke="currentColor" strokeWidth={1.5} strokeMiterlimit={10} strokeLinecap="round"/>
            <path d="M4.08008 5.2998H9.18008" stroke="currentColor" strokeWidth={1.5} strokeMiterlimit={10} strokeLinecap="round"/>
            <path d="M6.1001 8H10.2201" stroke="currentColor" strokeWidth={1.5} strokeMiterlimit={10} strokeLinecap="round"/>
            <path d="M5.37988 10.7002H9.48988" stroke="currentColor" strokeWidth={1.5} strokeMiterlimit={10} strokeLinecap="round"/>
        </g>
        <defs>
            <clipPath id="clip0_2027_6185">
                <rect width={16} height={16} fill="currentColor"/>
            </clipPath>
        </defs>
    </svg>
);

export default TreeFull;
