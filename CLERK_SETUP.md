# Clerk Google Auth Setup Guide

## Prerequisites
1. Clerk account created at https://clerk.com
2. Clerk application project created

## Frontend Setup (.env.local)

Create a `.env.local` file in the project root with:

```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key_here
```

**Where to get it:**
1. Go to Clerk Dashboard → (your project) → API Keys
2. Copy the "Publishable Key"
3. Paste it in .env.local as shown above

## Backend Setup (appsettings.json)

Update `backend/GoodDaysApi/appsettings.json`:

```json
{
  "Clerk": {
    "SecretKey": "sk_test_your_clerk_secret_key_here",
    "PublishableKey": "pk_test_your_clerk_publishable_key_here"
  }
}
```

**Where to get it:**
1. Go to Clerk Dashboard → (your project) → API Keys
2. Copy both "Publishable Key" and "Secret Key"
3. Paste them in appsettings.json as shown above

## Clerk Redirect URLs (Important!)

In Clerk Dashboard → Applications → Your App:

**Redirect URLs:**
- Development: `http://localhost:5173/auth/callback`
- Production: `https://yourdomain.com/auth/callback`

**Allowed Web Origins:**
- Development: `http://localhost:5173`
- Development: `http://localhost:5000`
- Production: `https://yourdomain.com`

## How It Works

1. **User clicks "Continue with Google"** on Login page
2. **Clerk handles OAuth flow** (user authenticates with Google)
3. **Redirect to `/auth/callback`** after Clerk authentication
4. **ClerkCallback component** exchanges Clerk user info for GoodDays JWT token
5. **Backend creates/links user** account and calls UserSeederService
6. **User redirected to Dashboard** with meals + workouts auto-seeded

## Testing

1. Start backend: `dotnet run` (in backend/GoodDaysApi)
2. Start frontend: `npm run dev`
3. Navigate to http://localhost:5173/login
4. Click "Continue with Google"
5. Sign in with Google account
6. Should be redirected to dashboard with meals/workouts seeded

## Features

✅ Google OAuth via Clerk
✅ Email/password signup still works
✅ Auto-create user account on first signin
✅ Auto-seed meals (18 ingredients + 5 templates)
✅ Auto-seed workout preset
✅ Link Clerk ID to existing email accounts
✅ Generate GoodDays JWT token for API calls

## Troubleshooting

- **"Session not found"**: Ensure Clerk keys are correct in both .env.local and appsettings.json
- **"Invalid redirect URL"**: Check Clerk dashboard redirect URLs match your domain
- **OAuth flow not starting**: Verify Clerk SignIn is properly configured in AuthContext
