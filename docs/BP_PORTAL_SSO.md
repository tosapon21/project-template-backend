# BP Portal SSO Setup

For creating a new project from this template and registering it as a new BP Portal system, see:

```text
BP_PORTAL_NEW_SYSTEM_REGISTRATION.md
```

Local ports:

- BP Portal frontend: `http://localhost:4200`
- BP Portal backend: `http://localhost:8080`
- This frontend: `http://localhost:4202`
- This backend: `http://localhost:8085`

Backend `.env` values:

```text
FRONTEND_URL=http://localhost:4202
BP_PORTAL_BASE_URL=http://localhost:8080
BP_PORTAL_CLIENT_ID=<client id>
BP_PORTAL_CLIENT_SECRET=<client secret>
BP_PORTAL_SSO_CALLBACK_PATH=/sso/callback
BP_PORTAL_SSO_SUCCESS_REDIRECT=/home
BP_PORTAL_SSO_FAILURE_REDIRECT=/login?sso_error=1
BP_PORTAL_SSO_DEBUG=false
```

Frontend environment values:

```ts
backendGraphqlURL: 'http://localhost:8085/graphql',
userImageURL: 'http://localhost:8085/user_image',
bpPortalFrontendURL: 'http://localhost:4200',
bpPortalClientId: '<client id>'
```

Register this redirect URI in BP Portal System Registry:

```text
http://localhost:8085/sso/callback
```

Supported flows:

- Active SSO launch from BP Portal redirects to:
  `http://localhost:8085/sso/callback?code=<code>&bp_sso_flow=active`
- Login button in this system redirects to BP Portal `/oauth/login` with:
  `redirect_uri=http://localhost:8085/sso/callback`
- BP Portal returns OAuth login button flow to:
  `http://localhost:8085/sso/callback?code=<code>&bp_sso_flow=oauth&state=<state>`

The backend exchanges codes server-side only:

- `bp_sso_flow=active` -> `POST /api/v1/sso/exchange-code`
- `bp_sso_flow=oauth` or missing -> `POST /oauth/exchange`, then `POST /api/v1/verify-token`

Run the database migration before first SSO login:

```bash
cd backend
npm run db1:migrate
```

Temporary troubleshooting:

Set `BP_PORTAL_SSO_DEBUG=true` in backend `.env` to log safe request summaries. The logs show endpoint, flow, callback URL, and whether required fields are present, but never print `client_secret`.
