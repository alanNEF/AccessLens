import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  hooks: {
    'build:manifestGenerated'(_wxt, manifest) {
      // A default popup intercepts toolbar clicks before action.onClicked.
      if (manifest.action) delete manifest.action.default_popup;
    },
  },
  manifest: {
    permissions: ['activeTab', 'scripting'],
    name: 'AccessLens',
    description: 'An accessibility simulator for developers.',
  },
});
