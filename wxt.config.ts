import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({ plugins: [tailwindcss()] }),
  hooks: {
    'build:manifestGenerated'(_wxt, manifest) {
      // A default popup intercepts toolbar clicks before action.onClicked.
      if (manifest.action) delete manifest.action.default_popup;
    },
  },
  manifest: {
    permissions: ['activeTab', 'scripting', 'storage'],
    name: 'AccessLens',
    description: 'An accessibility simulator for developers.',
  },
});
