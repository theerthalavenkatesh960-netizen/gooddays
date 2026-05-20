# GoodDays API (Minimal)

This folder contains a minimal **.NET 8** API intended to replace Supabase for the GoodDays app.

How to run (requires .NET 8 SDK):

dotnet restore
dotnet run --project GoodDaysApi

The API now uses PostgreSQL exclusively. You **must** provide a
`ConnectionStrings:Default` value (via `appsettings.json`, environment
variable, etc.) containing a valid PostgreSQL connection string.

Swagger UI usage (development):

- Start the API in the Development environment.
- Open the root URL (Swagger UI is served at `/` during development).
- To call protected endpoints, first obtain a JWT by POSTing to
	`/api/auth/signin` with `{ email, password }` — the response contains
	the token.
- Click the "Authorize" button in Swagger UI and paste `Bearer {token}`
	(or just the token if the UI prefaces it); Swagger will then attach
	the `Authorization` header to subsequent requests. The UI will persist
	the token between reloads.

If you never intend to use PostgreSQL locally, consider adding a
developer `appsettings.Development.json` with a local Postgres connection
for convenience.

Endpoints:
- POST /api/auth/signup { email, password, name }
- POST /api/auth/signin { email, password }
- GET  /api/auth/session (bearer token optional)
- GET  /api/userprofiles/{id}
- POST /api/userprofiles

Gmail finance sync configuration:

- `Google__ClientId` = Google OAuth client ID
- `Google__ClientSecret` = Google OAuth client secret
- `Google__RedirectUri` = API callback URL, e.g. `http://localhost:5000/api/finance/gmail/callback`
- `Google__FrontendRedirectAfterCallback` = frontend URL to return to, e.g. `http://localhost:5173/finance`
- `Google__OAuthStateSecret` = random secret for OAuth state signing
- `Encryption__Key` = Base64-encoded 32-byte key used to encrypt Gmail access/refresh tokens

Generate encryption key (PowerShell):

`[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))`

Gmail OAuth scope used by the API:

- `https://www.googleapis.com/auth/gmail.readonly`

New Gmail endpoints:

- GET `/api/finance/gmail/connect`
- GET `/api/finance/gmail/callback`
- POST `/api/finance/gmail/sync`
- DELETE `/api/finance/gmail/disconnect`
- GET `/api/finance/gmail/status`
