type Identity = { userId: string; email: string } | null;

// Hosted identity is supplied by Sites dispatch, never by browser state.
export function resolveAccess(identity: Identity, adminEmail: string | undefined, localDevelopment = false) {
  const canEdit = adminEmail
    ? !!identity?.userId && identity.email.toLowerCase() === adminEmail.trim().toLowerCase()
    : localDevelopment;
  return { canEdit, signedIn: !!identity };
}
