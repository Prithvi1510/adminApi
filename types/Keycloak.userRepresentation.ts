//https://www.keycloak.org/docs-api/latest/rest-api/index.html#UserRepresentation

import { CredentialRepresentation } from './Keycloak.credentialRepresentation.ts';

export interface UserRepresentation {
  id?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  emailVerified?: boolean;
  attributes?: Record<string, string[]>;
  enabled?: boolean;
  totp?: boolean;
  credentials?: CredentialRepresentation[],
  requiredActions?: string[];
  realmRoles?: string[];
  clientRoles?: Record<string, string[]>;
  groups?: string[];
}