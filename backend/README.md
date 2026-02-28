# GoodDays API (Minimal)

This folder contains a minimal **.NET 8** API intended to replace Supabase for the GoodDays app.

How to run (requires .NET 8 SDK):

dotnet restore
dotnet run --project GoodDaysApi

The API now uses PostgreSQL exclusively. You **must** provide a
`ConnectionStrings:Default` value (via `appsettings.json`, environment
variable, etc.) containing a valid PostgreSQL connection string.  
The project includes the `Npgsql.EntityFrameworkCore.PostgreSQL` provider
and will throw a startup exception if the string is missing or blank.  
All SQLite references are retained only for legacy purposes and can be
removed if desired.

Endpoints:
- POST /api/auth/signup { email, password, name }
- POST /api/auth/signin { email, password }
- GET  /api/auth/session (bearer token optional)
- GET  /api/userprofiles/{id}
- POST /api/userprofiles
