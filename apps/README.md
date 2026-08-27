# Deployment compatibility shims

The XML round-trip lab is one browser application at the repository root.

These directories exist only because the existing Vercel projects are still configured with the historical root directories `apps/console` and `apps/mobile-pwa`. Each build script copies the same root lab into its local `dist/` folder. They do not define separate Console or Mobile products.

Once the Vercel project settings are updated or the retired Mobile project is disconnected, these shims can be removed.
