import axios from "axios";
import { getAccessToken } from "./userService"

const KEYCLOAK_BASE_URL = process.env.KEYCLOAK_BASE_URL!;
const REALM = process.env.REALM!;
const CLIENT_NAME = process.env.CLIENT_NAME!; 

// Get all client roles for a given clientId
export async function getAllClientRoles(clientId: string) {
  const token = await getAccessToken();

  if (!token) {
    throw new Error("Failed to get access token from Keycloak");
  }

  // Step 1: Get client UUID from clientId
  const clientRes = await axios.get(
    `${KEYCLOAK_BASE_URL}/admin/realms/${REALM}/clients`,
    {
      params: { clientId },
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    } 
  );

  if (!Array.isArray(clientRes.data) || clientRes.data.length === 0) {
    throw new Error(`Client not found for clientId: ${clientId}`);
  }

  const clientUUID = clientRes.data[0].id;

  // Step 2: Fetch roles using client UUID
  const rolesRes = await axios.get(
    `${KEYCLOAK_BASE_URL}/admin/realms/${REALM}/clients/${clientUUID}/roles`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  return rolesRes.data;
}

