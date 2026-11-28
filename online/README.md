# Divercity public preview
The currently published version is built from static-site/ via node build-static.mjs.
The build supports a Mapbox map and shared Supabase meetups and free-board posts.
The unfinished cloud API work under app/, lib/, db/ is retained for later and is not part of the static deployment.
This directory preserves the public preview source and unfinished cloud work in Web-Diversity/Divercity-Frontend. Use node build-static.mjs for the published static version; the framework build is not the current deployment.

## Supabase email authentication
- The static preview supports email/password signup, login and local-session logout through Supabase Auth.
- Copy `online/.env.example` to `online/.env.local`, then set `SUPABASE_URL` and the public publishable/anon key. The static build injects these values into `dist/js/supabase-config.js`; never put a `service_role` key or database password in the browser bundle.
- Run `node build-static.mjs` from `online/` after setting the local environment file. `.env.local` is ignored by Git and must not be committed.
- Set the Supabase Auth Site URL and redirect URL to the deployed static site origin. Keep email confirmation enabled unless the project owner deliberately changes it.
- Authentication identifies the user for shared board and meetup writes. Course reviews, campus reviews, profile edits and chat demonstrations use browser-local storage.
- The browser loads `@supabase/supabase-js` v2 as an ES module from esm.sh, so users need an internet connection to sign in.

## Shared meetups and map

1. Configure the classroom project URL from `SUPABASE.md` and its publishable key in `online/.env.local`. This uses the existing community migration and policies.
2. Set `MAPBOX_PUBLIC_TOKEN` to a public Mapbox token. The build writes it to `dist/assets/map-config.json`.
3. From `online/`, run `node build-static.mjs` and serve `dist/` at the root of a static HTTP site.
4. Sign in with a classroom account and use **모임 만들기**. Pick a campus location and a future date and time. After saving, the map and **모임 목록** use the same Supabase post and coordinates.
5. Open the same URL in another browser session. The meetup and its participant count are publicly readable. Use a second signed-in account to test participation.

The authenticated author can edit or delete their meetup. Participation uses the team's `join_meetup` and `leave_meetup` functions. Existing browser-local demo meetups stay in their original storage. The configured site shows the shared meetup list. The meetup chat link opens a browser-local demo.

## Shared free board

1. Use the same classroom Supabase configuration and static build.
2. Sign in, open **자유게시판**, and publish a post. The database assigns the author using the signed-in account.
3. In a different browser session, open **자유게시판** or its post link to confirm that the new post is readable without a login.
4. Sign in as another account to comment, like or save. Reload as the original author to confirm the comment and public like count. The saved-post list is personal.

The configured board displays shared free posts. Existing browser-local examples and drafts are not uploaded into the shared database.
