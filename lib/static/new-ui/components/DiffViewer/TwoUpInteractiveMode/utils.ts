export function calculateZoomAtPoint(
    currentScale: number,
    currentTranslateX: number,
    currentTranslateY: number,
    newScale: number,
    zoomPointX: number,
    zoomPointY: number
): {scale: number; translateX: number; translateY: number} {
    const scaleRatio = newScale / currentScale;

    const pointViewportX = zoomPointX - currentTranslateX;
    const pointViewportY = zoomPointY - currentTranslateY;

    const newTranslateX = zoomPointX - pointViewportX * scaleRatio;
    const newTranslateY = zoomPointY - pointViewportY * scaleRatio;

    return {
        scale: newScale,
        translateX: newTranslateX,
        translateY: newTranslateY
    };
}
