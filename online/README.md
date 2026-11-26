# Divercity public preview
The currently published version is built from static-site/ via node build-static.mjs.
It includes a real Mapbox map and browser-local community/chat demonstrations.
There is no shared public database in this publication. No local profiles, chat logs or .env files are uploaded.
The unfinished cloud API work under app/, lib/, db/ is retained for later and is not part of the static deployment.
This directory preserves the public preview source and unfinished cloud work in Web-Diversity/Divercity-Frontend. Use node build-static.mjs for the published static version; the framework build is not the current deployment.

## Supabase email authentication
- The static preview supports email/password signup, login and local-session logout through Supabase Auth.
- Copy `online/.env.example` to `online/.env.local`, then set `SUPABASE_URL` and the public publishable/anon key. The static build injects these values into `dist/js/supabase-config.js`; never put a `service_role` key or database password in the browser bundle.
- Run `node build-static.mjs` from `online/` after setting the local environment file. `.env.local` is ignored by Git and must not be committed.
- Set the Supabase Auth Site URL and redirect URL to the deployed static site origin. Keep email confirmation enabled unless the project owner deliberately changes it.
- Authentication identifies the user in the browser. Posts, profile edits and chat demonstrations remain local to that browser; this does not add shared cloud data or server-side authorization.
- The browser loads `@supabase/supabase-js` v2 as an ES module from esm.sh, so users need an internet connection to sign in.
