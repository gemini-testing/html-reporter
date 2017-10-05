/* global Handlebars */

function hasFails(node) {
    return walk(node, hasFails, node.result && (node.result.error || node.result.fail));
}

function hasRetries(node) {
    return walk(node, hasRetries, node.retries && node.retries.length);
}

function walk(node, cb, condition) {
    return ['children', 'browsers'].reduce(function(result, prop) {
        const collection = node[prop];
        return result || Array.isArray(collection) && collection.some(cb);
    }, condition);
}

function pathToUrl(filePath) {
    return filePath.split('/').map(function(item) {
        return encodeURIComponent(item);
    }).join('/');
}

Handlebars.registerHelper('section-status', function() {
    if (this.result && this.result.skipped) {
        return 'section_status_skip';
    }

    if (hasFails(this)) {
        return 'section_status_fail';
    }

    return 'section_status_success';
});

Handlebars.registerHelper('image-box-status', function() {
    const result = this.result;

    if (result.error) {
        return 'image-box_error';
    }

    return '';
});

Handlebars.registerHelper('has-retries', function() {
    return hasRetries(this) ? 'has-retries' : '';
});

Handlebars.registerHelper('has-fails', function() {
    return this.failed > 0 ? 'summary__key_has-fails' : '';
});

Handlebars.registerHelper('image', function(kind) {
    const url = pathToUrl(this[kind + 'Path']);
    return new Handlebars.SafeString('<img data-src="' + url + '">');
});

Handlebars.registerHelper('inc', function(value) {
    return parseInt(value) + 1;
});
