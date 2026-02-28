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
