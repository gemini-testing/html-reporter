# HTML Reporter Plugin Example

## What it does

Adds a collapsible "Random Number" section to test results that fetches a random number from the server when expanded.

![Screenshot](plugin-screenshot.png)

## Project Structure

```
├── ui/                  # Frontend plugin (React + Redux)
├── server/              # Express middleware
├── preset-for-config/   # Config preset factory
└── package.json
```

## Building

```bash
npm install
npm run build
```

## Usage

1. Install the plugin in your project (or link it locally using `npm link random-number-plugin-example` for development)

2. Update your `testplane.config.ts`:

```ts
import randomNumberPluginUI from 'random-number-plugin-example';

export default {
    // ... other config
    plugins: {
        'html-reporter/testplane': {
            enabled: true,
            // Enable plugins and add plugin preset to html-reporter config
            pluginsEnabled: true,
            plugins: randomNumberPluginUI(),
        },
    },
};
```

3. Run your tests with html-reporter enabled — the plugin section will appear in test results.
