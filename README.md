# Aidee Vivatech

Fresh Next.js app for the Aidee redesign and migration from the legacy
`aidee-ver2.0` project.

## Stack

- Next.js App Router
- React
- Tailwind CSS
- Vercel deployment
- Supabase auth, database, and storage

## Local Setup

Install dependencies and start the app:

```bash
npm install
npm run dev
```

The app expects local secrets in `.env.local`. Copy the required key names from
`.env.example` and populate them from the new Supabase and AI provider projects.

## Google Login

The initial auth flow uses Supabase SSR auth:

1. Enable the Google provider in the new Supabase project.
2. Create a Google OAuth Web client for the app.
3. Add the app origin in Google Authorized JavaScript origins, including
   `http://localhost:3000` for local development.
4. Add the Supabase Google callback URL shown in the Supabase provider settings
   to Google Authorized redirect URIs.
5. In Supabase Auth URL Configuration, add the app callback routes that may be
   used as `redirectTo` targets:
   - `http://localhost:3000/auth/callback`
   - the Vercel preview callback URL pattern
   - the production domain callback URL

The local app routes are:

- `/` for the start page
- `/login` for Google sign-in
- `/auth/callback` for the Supabase PKCE code exchange
- `/workspace` as the first protected page

## New Project Setup Order

1. Create a new Supabase project for this app.
2. Create database migrations for the migrated Aidee schema before feature UI
   work depends on tables or storage policies.
3. Configure Supabase Auth providers and redirect URLs for local, preview, and
   production environments.
4. Import this Git repository as a new Vercel project.
5. Add the environment variables from `.env.example` to Vercel Development,
   Preview, and Production scopes.
6. Add the existing production domain to the new Vercel project after the first
   deployment is verified.

## Migration Boundary

The redesign should reuse legacy domain logic selectively:

- Move Supabase auth and session utilities first.
- Recreate the schema, storage buckets, RLS policies, and generated types in
  this repo instead of copying production state by hand.
- Move project, study-stage, RFP, prompt, and API contracts behind stable
  server-side modules.
- Rebuild screens and interactive components from the new Figma wireframes.

The larger legacy UI surfaces, especially the chat workspace and dashboard
components, are reference material rather than drop-in components.
