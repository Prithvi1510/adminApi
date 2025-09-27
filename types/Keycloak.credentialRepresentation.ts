//https://www.keycloak.org/docs-api/latest/rest-api/index.html#CredentialRepresentation

export interface CredentialRepresentation {
  id?: string;
  type?: string; // e.g., "password", "otp"
  userLabel?: string;
  createdDate?: number; // timestamp (int64)
  secretData?: string;
  credentialData?: string;
  priority?: number; // int32
  value?: string; // actual password or OTP (only used for creation)
  temporary?: boolean; // true = user must reset password on next login
  device?: string;
  hashedSaltedValue?: string;
  salt?: string;
  hashIterations?: number; // int32
  counter?: number; // int32 (used in OTP)
  algorithm?: string; // e.g., "pbkdf2-sha256"
  digits?: number; // OTP digits
  period?: number; // OTP period (TOTP)
  config?: Record<string, any>; // flexible for WebAuthn/FIDO/etc.
  federationLink?: string;
}
