# Customizing GUI

## Overview

:warning: _This method of GUI customization is outdated. It is recommended to use [report plugins](./html-reporter-plugins.md) instead._

Use the `customGui` option in the `html-reporter` plugin config to add custom controls for GUI mode.

For controls, their type (button or radio button), labels and values, as well as initialization functions and the main click action are set. The controls should be divided into separate sections depending on their purpose. At least one section must be specified.

By default, the value of the `customGui` option is `{}`.

## Setup

The `customGui` option requires an object of the following format for its value:

```javascript
customGui: {
    '<section name>': [
        {
            type: '<type of control>', // 'button' or 'radiobutton'
            controls: [
                {
                    label: '<label on the control>',
                    value: '<value of the control>'
                },

                // other controls...
            ],
            initialize: async ({ hermione, ctx }) => {
                // initialization code
                // the return value will be ignored
            },
            action: async ({ hermione, ctx, control }) => {
                // action code
                // the return value will be ignored
            }
        },

        // other groups of controls...
    ],

    // other sections...
}
```

### Description of configuration parameters

| **Parameter** | **Type** | **Description** |
| ------------- | -------- | --------------- |
| type | String | Required parameter. The type of controls. Available values: _'button'_ and _'radiobutton'_. |
| controls | Array | An array of objects, each of which describes a control. The object must consist of two keys: _label_ and _value_, which specify the label on the control and its value. |
| initialize | Function | Optional parameter. Asynchronous function that will be executed on the server side when Hermione starts in GUI mode. An object of the form _{ hermione, ctx }_ will be passed to the function, where _hermione_ is an instance of hermione, and _ctx_ is an object describing a group of elements for which the initialization function is called. |
| action | Function | Required parameter. Asynchronous function that will be executed on the server side when the user clicks on the control. An object of the form _{ hermione, ctx, control }_ will be passed to the function, where _hermione_ is an instance of hermione, _ctx_ is an object describing a group of elements for which the _action_ function is called, and _control_ is a link to the control that the user clicked on. |

## Usage example

Adding radio buttons to change the base URL in GUI mode:

```javascript
customGui: {
    'some-meaningful-name-of-section': [
        {
            type: 'radiobutton',
            controls: [
                {
                    label: 'Dev',
                    value: 'http://localhost/development/'
                },
                {
                    label: 'Prod',
                    value: 'http://localhost/production/'
                }
            ],
            initialize: async ({ hermione, ctx }) => {
                const { config } = hermione;
                const browserIds = config.getBrowserIds();

                if (browserIds.length) {
                    const { baseUrl } = config.forBrowser(browserIds[0]);

                    ctx.controls.forEach((control) => {
                        control.active = (baseUrl === control.value);
                    });
                }
            },
            action: async ({ hermione, ctx, control }) => {
                const { config } = hermione;

                config
                    .getBrowserIds()
                    .forEach((browserId) => {
                        config.forBrowser(browserId).baseUrl = control.value;
                    });
            }
        }
    ]
}
```
