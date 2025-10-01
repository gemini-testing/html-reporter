# Developing Plugins SDK

Plugins SDK is a set of entities that simplify HTML Reporter plugins creation.

There are two parts of Plugins SDK:
- Common SDK
- Frontend SDK

### Common SDK

This part is exposed as `html-reporter/plugins-sdk`. It may contain constants, types and helpers that can be used in both Node and Frontend environments.

It exports actual constants and helpers that can be used directly.

### Frontend SDK

This part is exposed as `html-reporter/plugins-sdk/ui`. It may contain react components and UI-specific entities.

Important note: only typings are actually exposed there. Here's why: actual components are injected in dependencies array at `lib/static/modules/load-plugin.js`.

So here we only need to provide type definitions. If you try to actually import those, you'd get undefined.

Since HTML Reporter frontend heavily relies on aliases like `@/lib/static/...`, when building typings we need to correctly resolve them. This is done via `ts-patch` (used as `npx tspc`) and `typescript-transform-paths` plugin.
