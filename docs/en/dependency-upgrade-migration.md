# Dependency security upgrade

The dependency security upgrade requires Node.js **22.22.0 or newer** for installation, report generation and GUI servers. Previously generated static reports do not require Node.js to view them in a browser.

The reporter keeps React and React DOM **18**, Redux **4**, React Redux **7** and Express **4**. Existing plugin rendering APIs and Express route patterns remain supported. Plugins should continue using the reporter's supplied dependencies, including `react/jsx-runtime`, instead of bundling a second React runtime.
