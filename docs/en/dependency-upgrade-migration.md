# Dependency upgrade migration

The dependency security upgrade in PR #796 must be released as a **major version**, not a patch or minor release. It changes the supported Node.js runtime and the dependencies exposed to plugins. The package version will be assigned by the release workflow.

## Node.js

Use Node.js **22.22.0 or newer** when installing or running the reporter, including CI, report generation and GUI servers. Node.js 18 and 20 are no longer supported. A previously generated static report does not require Node.js to view it in a browser.

## React plugins

The reporter supplies React and React DOM **19**, Redux **5** and React Redux **9** to plugins. Test plugins against these supplied dependencies rather than bundling a second copy of React or React Redux.

- Export React components from your plugin and let the reporter mount them at the configured extension points. This remains the supported plugin rendering path.
- React DOM no longer exports `render`, `hydrate`, `unmountComponentAtNode` or `findDOMNode`. Plugins that use these APIs need migration; updating the dependency alone is not sufficient.
- `react-dom/client` is not currently provided by the plugin dependency loader. Do not simply change a plugin's requested dependency to it. Prefer an exported component managed by the reporter; use the supplied `react-dom.createPortal` when rendering that component's content into another DOM container.
- Function-component `propTypes` are no longer checked by React, and function-component `defaultProps` must be replaced with default parameters. Class-component `defaultProps` remain supported.
- Keep Redux actions as plain objects with string `type` fields. Thunk actions remain supported by the reporter's middleware. Redux middleware now receives `unknown`; validate actions before accessing fields that your middleware depends on.

See the [React 19 upgrade guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide) and [Redux migration guide](https://redux.js.org/usage/migrations/migrating-rtk-2).

## GUI server plugins

The GUI now uses **Express 5**. This also applies to routers passed to plugin middleware and to the server exposed through `SERVER_INIT`.

Update route patterns before upgrading:

| Express 4 pattern | Express 5 pattern |
| --- | --- |
| `*` or `/*` | `/{*splat}` to include the root, or `/*splat` to exclude it |
| `/file.:ext?` | `/file{.:ext}` |

String route patterns no longer support regular-expression characters such as `[]` or `()` in the same way. See the [Express 5 migration guide](https://expressjs.com/en/guide/migrating-5/) for route syntax, response API and request parsing changes.

The reporter explicitly keeps extended query parsing so that `filter[status]=fail` still produces a nested object. JSON parsing runs before plugin routes. These compatibility settings do not restore all Express 4 behavior.

If middleware registration throws, the reporter logs the plugin name and original error stack, skips that plugin's router and continues initializing other plugins. Requests to an unregistered plugin middleware receive HTTP 400. Check the GUI server logs if an endpoint is unavailable.

## Validation before release

Run `npm test` and `npm run build`, then the plugin E2E suite against generated plugin fixtures with the project's Docker browser environment. Check basic rendering, menu items, Redux updates and server-backed thunk actions. The repository's fixtures cannot establish compatibility for every third-party plugin; plugin authors must check their own React DOM and Express usage.
