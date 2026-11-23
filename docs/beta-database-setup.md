# Discordiny Beta — database initialization

Do not merge or deploy beta until this setup and the remaining access-control work are completed.

The current repository does not include a complete historical D1 schema migration for production. Export only the production schema (no player data) to bootstrap beta.

## Requirements
- Wrangler authenticated with access to both D1 databases.
- Production D1: `discordiny`
- Beta D1: `beta-discordiny` (2ae57a83-48bd-4338-8896-a2b3bb0bae0d)
- Do not use `--local` for the remote setup.

## 1. Export the schema only (read-only on production)

```sh
npx wrangler d1 export discordiny --remote --no-data --output=beta-schema.sql --config=wrangler.json
```

Inspect `beta-schema.sql` before continuing. It must contain table/index definitions but **no production account or gameplay INSERT statements**. If the installed Wrangler version does not support `--no-data`, stop; do not export/import a full production database.

## 2. Import into the beta D1 database ONLY

```sh
npx wrangler d1 execute beta-discordiny --remote --file=beta-schema.sql --config=wrangler.beta.json
```

This initializes beta gameplay tables without production player rows. Schema-only export may omit required static lookup data; validate the game flows before opening beta.

## 3. Create the durable access registry in production

```sh
npx wrangler d1 execute discordiny --remote --file=migrations/009_beta_access.sql --config=wrangler.json
```

The migration creates `beta_settings` and `beta_invites` only. It does not delete or change existing player rows. The beta Worker reads these through `ACCESS_DB`; beta gameplay is bound to `DB`.

## 4. Verify both databases

```sh
npx wrangler d1 execute beta-discordiny --remote --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name" --config=wrangler.beta.json
npx wrangler d1 execute discordiny --remote --command="SELECT enabled FROM beta_settings WHERE id=1" --config=wrangler.json
```

Expected production beta setting: `enabled = 0` (closed by default).

## Deployment cautions

- Beta requires a separately configured Worker with `DISCORD_CLIENT_SECRET` set as a secret. Never put the secret in Git.
- Beta OAuth redirect must be registered at `https://beta.discordiny.com/api/auth/callback`.
- Beta's `ACCESS_DB` binding intentionally points to production for invitations only. Never run reset commands against `ACCESS_DB`.
- The beta reset operation and full site gate are not implemented yet; do not enable public beta.
- Bungie linking is not beta-ready; the registered production-only callback must not be replaced.
- Remove the temporary `beta-schema.sql` export from your working directory after import; do not commit it without review.

## Automatic beta deployment

The dedicated `discordiny-beta` Cloudflare Worker uses GitHub branch `game-updates`, build command `npm run build`, and deploy command `npx wrangler deploy --config wrangler.beta.json`. Its Cloudflare **Production** environment is the primary environment of the *beta Worker*, not the live `discordiny` Worker. A new commit to `game-updates` should trigger a build when GitHub integration is enabled. Verify that deployment logs name `discordiny-beta` before attaching beta domains. Do not merge the branch into `main` just to deploy beta.
