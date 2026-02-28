# GoodDays API (Minimal)

This folder contains a minimal .NET 7 API intended to replace Supabase for the GoodDays app.

How to run (requires .NET 7 SDK):

dotnet restore
dotnet run --project GoodDaysApi

The API will create a local SQLite DB file `gooddays.db` in the project folder.

Endpoints:
- POST /api/auth/signup { email, password, name }
- POST /api/auth/signin { email, password }
- GET  /api/auth/session (bearer token optional)
- GET  /api/userprofiles/{id}
- POST /api/userprofiles
