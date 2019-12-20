const parsers = {
    'array': setArrayField,
    'string': setStringField,
    'number': setNumberField,
    'boolean': setBooleanField
};

export function parseQuery(url, spec) {
    const parsedURL = new URL(url);

    const searchParams = parsedURL.searchParams;
    const query = {};

    for (const key in spec) {
        if (Object.prototype.hasOwnProperty.call(spec, key)) {
            const {type, param = key} = spec[key];
            parsers[type](query, searchParams, param, key);
        }
    }

    return query;
}

function setArrayField(query, searchParams, field, as = field) {
    const value = searchParams.getAll(field);
    if (value.length) {
        query[as] = value;
    }
}

function setNumberField(query, searchParams, field, as = field) {
    const value = searchParams.get(field);
    if (value && !isNaN(value)) {
        query[as] = Number(value);
    }
}

function setBooleanField(query, searchParams, field, as = field) {
    const value = searchParams.get(field);
    if (value) {
        query[as] = value === 'true';
    }
}

function setStringField(query, searchParams, field, as = field) {
    const value = searchParams.get(field);
    if (typeof value === 'string') {
        query[as] = value;
    }
}

export function getUrlWithQuery(url, query) {
    const parsedURL = new URL(url);

    const params = parsedURL.searchParams;

    for (let paramName in query) {
        if (Object.prototype.hasOwnProperty.call(query, paramName)) {
            const value = query[paramName];
            if (Array.isArray(value)) {
                params.delete(paramName);
                for (const v of value) {
                    params.append(paramName, v);
                }
            } else {
                params.set(paramName, query[paramName]);
            }
        }
    }

    return parsedURL.href;
}
