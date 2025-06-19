export const encodePackageNameRoute = (packageName: string): string => {
    return packageName.replace(/[/@.]/g, '__');
};

export const getPluginMiddlewareRoute = (pluginName: string): string => {
    return `/plugin-routes/${encodePackageNameRoute(pluginName)}`;
};
