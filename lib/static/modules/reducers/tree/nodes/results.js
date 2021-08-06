export function addResult(tree, result) {
    tree.results.byId[result.id] = result;

    if (!tree.results.allIds.includes(result.id)) {
        tree.results.allIds.push(result.id);
    }

    const browserId = result.parentId;

    if (!tree.browsers.byId[browserId].resultIds.includes(result.id)) {
        tree.browsers.byId[browserId].resultIds.push(result.id);
    }
}
