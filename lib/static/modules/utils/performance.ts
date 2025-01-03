export function extractPerformanceMarks(): Record<string, number> {
    const marks = performance?.getEntriesByType?.('mark') || [];

    return marks.reduce((acc, {name, startTime}) => {
        acc[name] = Math.round(startTime);

        return acc;
    }, {} as Record<string, number>);
}
