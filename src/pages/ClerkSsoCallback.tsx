import { AuthenticateWithRedirectCallback } from '@clerk/clerk-react';

export default function ClerkSsoCallback() {
  return <AuthenticateWithRedirectCallback />;
}
