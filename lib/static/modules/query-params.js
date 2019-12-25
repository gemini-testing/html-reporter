const parsers = {
    'array': parseArray,
    'string': parseString,
    'number': parseNumber,
    'boolean': parseBoolean
};

export function parseQuery(url, spec) {
    const parsedURL = new URL(url);

    const searchParams = parsedURL.searchParams;
    const query = {};

    for (const key in spec) {
        if (Object.prototype.hasOwnProperty.call(spec, key)) {
            const value = getValue(searchParams, spec[key], key);
            if (typeof value !== 'undefined') {
                query[key] = value;
            }
        }
    }

    return query;
}

function getValue(searchParams, keySpec, key) {
    const {type, param = key, parse} = keySpec;

    if (type === 'custom') {
        return parseCustom(searchParams, parse, param);
    } else {
        return parsers[type](searchParams, param);
    }
}

function parseArray(searchParams, param) {
    const value = searchParams.getAll(param);
    if (value.length) {
        return value;
    }
}

function parseNumber(searchParams, param) {
    const value = searchParams.get(param);
    if (value && !isNaN(value)) {
        return Number(value);
    }
}

function parseBoolean(searchParams, param) {
    const value = searchParams.get(param);
    if (value) {
        return value === 'true';
    }
}

function parseString(searchParams, param) {
    const value = searchParams.get(param);
    if (typeof value === 'string') {
        return value;
    }
}

function parseCustom(searchParams, parse, param) {
    return parse(searchParams, param);
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
