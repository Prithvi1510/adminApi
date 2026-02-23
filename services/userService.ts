import { post, get } from "axios";
require("dotenv").config();
import { UserRepresentation } from "../types/Keycloak.userRepresentation";
import { TokenResponse } from "../types/Keycloak.tokenResponse";
import axios from "axios";

import  {KeycloakClientRepresentation} from '../types/Keycloak.clientRepresentation';

const { KEYCLOAK_BASE_URL, REALM, CLIENT_ID, CLIENT_SECRET , CLIENT_NAME } = process.env;

export interface createUserBody {
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  password?: string;
  requiredActions?: string[];

  // new attributes
  phone_number?: string;
  CreatedBy?: string;

  // optional client roles
  clientRoles?: {
    clientId: string;
    roles: string[];
  };
}


interface deleteUserBody {
  realm: string;
  userid: string;
}

interface keycloakAPIResponse {
  code: any;
  message: any;
  Datatype?: any;
}

interface RoleRepresentation {
  id?: string;
  name?: string;
  description?: string;
  clientRole?: boolean;
  containerId?: string;
}

interface UserRoles {
  realmRoles?: RoleRepresentation[];
  clientRoles?: RoleRepresentation[];
}

export async function getAccessToken(): Promise<string | undefined> {
  const tokenUrl = `${KEYCLOAK_BASE_URL}/realms/${REALM}/protocol/openid-connect/token`;

  const params = new URLSearchParams();
  params.append("client_id", CLIENT_ID!);
  params.append("client_secret", CLIENT_SECRET!);
  params.append("grant_type", "client_credentials");

  const response = await post<TokenResponse>(tokenUrl, params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  return response.data.access_token as any;
}

// Helper: Build the Keycloak user payload
function buildUserPayload(userData: createUserBody): UserRepresentation {
  return {
    username: userData.username,
    email: userData.email,
    enabled: true,
    firstName: userData.firstName,
    lastName: userData.lastName,

    credentials: userData.password
      ? [
          {
            type: "password",
            value: userData.password,
            temporary: true,
          },
        ]
      : undefined,

    requiredActions: userData.requiredActions ? userData.requiredActions : [],

    // ADD ATTRIBUTES HERE
    attributes: {
      phone_number: userData.phone_number ? [userData.phone_number] : [],
      CreatedBy: userData.CreatedBy ? [userData.CreatedBy] : [],
    },
  };
}



//Helper Function to only include certain fields in roles Response
export function filterRoleFields(roles: any): any {
  const extractNames = (roleArray: any[]) => roleArray.map((r) => r.name);

  return {
    realmRoles: extractNames(roles.realmRoles || []),
    clientRoles: extractNames(roles.clientRoles || []),
  };
}

// ***********************************************************************************************************************
// API Services
// ***********************************************************************************************************************

export async function getAllUsers() {
  const token = await getAccessToken();
  const usersResponse = await get(
    `${KEYCLOAK_BASE_URL}/admin/realms/${REALM}/users`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const userArray = usersResponse.data as Array<any>;

  const ids = userArray.map((user: any) => user.id);
  const roles = await getAllUsersRoles(ids);

  // Merge roles into user data
  const usersWithRoles = userArray.map((user: any) => ({
    ...user,
    roles: filterRoleFields(roles[user.id]) || { realmRoles: [], clientRoles: [] },
  }));

  usersResponse.data = usersWithRoles;

  return usersResponse.data;
}

export async function getOneUser(userId: string) {
  const token = await getAccessToken();
  try {
    const userResponse = (await get(
      `${KEYCLOAK_BASE_URL}/admin/realms/${REALM}/users/${userId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )) as any;
    const roles = await getUserRoles(userId);
    const roleFields = filterRoleFields(roles);

    userResponse.data.roles = {
      realmRoles: roleFields.realmRoles,
      clientRoles: roleFields.clientRoles,
    };

    return userResponse.data;
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      return null; // User not found
    }
    throw error; // Rethrow other errors
  }
}

//https://www.keycloak.org/docs-api/latest/rest-api/index.html#_users
export async function createUser(userData: createUserBody): Promise<any> {
  const token = await getAccessToken();
  const payload = buildUserPayload(userData);

  const actionsList = [
    "VERIFY_EMAIL",
    "UPDATE_PROFILE",
    "CONFIGURE_TOTP",
    "UPDATE_PASSWORD",
  ];

  // ✅ filter required actions
  if (userData.requiredActions && userData.requiredActions.length > 0) {
    payload.requiredActions = userData.requiredActions.filter((action) =>
      actionsList.includes(action)
    );
  } else {
    payload.requiredActions = [];
  }

  try {
    // 1) Create user
    const response = await axios.post(
      `${KEYCLOAK_BASE_URL}/admin/realms/${REALM}/users`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Keycloak gives userId in Location header
    const location = response.headers?.location;
    const userId = location?.split("/").pop();

    // 2) Assign client roles (optional)
    if (userData.clientRoles && userId) {
      const { clientId, roles } = userData.clientRoles;

      // 2a) Find client UUID by clientId
      const clientRes = await axios.get<KeycloakClientRepresentation[]>(
        `${KEYCLOAK_BASE_URL}/admin/realms/${REALM}/clients?clientId=${clientId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const clients = clientRes.data;

      if (!clients || clients.length === 0) {
        return {
          success: false,
          status: 400,
          message: `Client not found: ${clientId}`,
        };
      }

      const clientUUID = clients[0].id;



      // 2b) Fetch role representations
      const roleReps = await Promise.all(
        roles.map(async (roleName) => {
          const roleRes = await axios.get(
            `${KEYCLOAK_BASE_URL}/admin/realms/${REALM}/clients/${clientUUID}/roles/${roleName}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          return roleRes.data;
        })
      );

      // 2c) Assign roles to the user
      await axios.post(
        `${KEYCLOAK_BASE_URL}/admin/realms/${REALM}/users/${userId}/role-mappings/clients/${clientUUID}`,
        roleReps,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return {
      success: true,
      status: 201,
      message: "User created successfully",
      userId,
    };
  } catch (error: any) {
    if (error.response) {
      return {
        success: false,
        status: error.response.status,
        message:
          error.response.status === 409
            ? "This user or email is already enrolled"
            : error.response.data || error.message,
      };
    }

    return {
      success: false,
      status: 500,
      message: error.message,
    };
  }
}



export async function deleteUser(userId: string): Promise<any> {
  const token = await getAccessToken();

  try {
    const response = await axios.delete(
      `${KEYCLOAK_BASE_URL}/admin/realms/${REALM}/users/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status === 204) {
      return { code: 200, message: `User ${userId} deleted successfully` };
    } else {
      return {
        code: response.status,
        message: response.statusText,
        data: response.data,
      };
    }
  } catch (error: any) {
    if (error.response) {
      const status = error.response.status;
      let message = "";
      switch (status) {
        case 400:
          message = "Bad Request";
          break;
        case 403:
          message = "Forbidden";
          break;
        case 404:
          message = "Not Found";
          break;
        default:
          message = error.response.statusText || "Error";
      }
      return { code: status, message, data: error.response.data };
    } else {
      return { code: 500, message: error.message };
    }
  }
}

/// Updation Endpoints
export async function disableUser(userId: string): Promise<any> {
  const token = await getAccessToken();

  try {
    const response = await axios.put(
      `${KEYCLOAK_BASE_URL}/admin/realms/${REALM}/users/${userId}`,
      { enabled: false },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    return {
      code: 200,
      message: `User is disable ${userId}`,
      data: response.data || null,
    };
  } catch (error: any) {
    if (error.response) {
      return {
        code: error.response.status,
        message: error.response.statusText,
        data: error.response.data,
      };
    } else {
      return {
        code: 500,
        message: error.message,
        data: null,
      };
    }
  }
}

// Enable User 
export async function enableUser(userId: string): Promise<any> {
  const token = await getAccessToken();

  try {
    const response = await axios.put(
      `${KEYCLOAK_BASE_URL}/admin/realms/${REALM}/users/${userId}`,
      { enabled: true },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    return {
      code: 200,
      message: `User is Enabled ${userId}`,
      data: response.data || null,
    };
  } catch (error: any) {
    if (error.response) {
      return {
        code: error.response.status,
        message: error.response.statusText,
        data: error.response.data,
      };
    } else {
      return {
        code: 500,
        message: error.message,
        data: null,
      };
    }
  }
}


// PUT /admin/realms/{realm}/users/{user-id}
//https://www.keycloak.org/docs-api/latest/rest-api/index.html#_users

function updateUserPayload(userData: any): Partial<UserRepresentation> {
  return {
    ...(userData.username !== undefined && { username: userData.username }),
    ...(userData.email !== undefined && { email: userData.email }),
    ...(userData.enabled !== undefined && { enabled: userData.enabled }),
    ...(userData.firstName !== undefined && { firstName: userData.firstName }),
    ...(userData.lastName !== undefined && { lastName: userData.lastName }),
    ...(userData.emailVerified !== undefined && { emailVerified: userData.emailVerified }),

    ...(userData.resetPassword && {
      credentials: [
        {
          type: "password",
          value: "tempass123",
          temporary: true,
        },
      ],
    }),

    // ...(userData.requiredActions && {
    //   requiredActions: userData.requiredActions,
    // }),
    

    //Since attributes is a nested object, we need to conditionally build it to avoid sending empty attributes
    ...(userData.phone_number || userData.CreatedBy
      ? {
          attributes: {
            ...(userData.phone_number && {
              phone_number: [userData.phone_number],
            }),
            ...(userData.CreatedBy && {
              CreatedBy: [userData.CreatedBy],
            }),
          },
        }
      : {}),
  };
}


async function updateClientRoles(
  token: string,
  userId: string,
  clientId: string,
  roles: string[]
) {
  const clientRes = await axios.get<KeycloakClientRepresentation[]>(
    `${KEYCLOAK_BASE_URL}/admin/realms/${REALM}/clients?clientId=${clientId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const clientUUID = clientRes.data[0]?.id;
  if (!clientUUID) return;

  // Typed response
  const existingRolesRes = await axios.get<RoleRepresentation[]>(
    `${KEYCLOAK_BASE_URL}/admin/realms/${REALM}/users/${userId}/role-mappings/clients/${clientUUID}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  // Correct DELETE with body
  if (existingRolesRes.data.length > 0) {
    await axios.request({
      method: "DELETE",
      url: `${KEYCLOAK_BASE_URL}/admin/realms/${REALM}/users/${userId}/role-mappings/clients/${clientUUID}`,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: existingRolesRes.data,
    });
  }

  // Fetch new role representations
  const roleReps = await Promise.all(
    roles.map(async (roleName) => {
      const roleRes = await axios.get<RoleRepresentation>(
        `${KEYCLOAK_BASE_URL}/admin/realms/${REALM}/clients/${clientUUID}/roles/${roleName}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return roleRes.data;
    })
  );

  // Assign roles
  await axios.post(
    `${KEYCLOAK_BASE_URL}/admin/realms/${REALM}/users/${userId}/role-mappings/clients/${clientUUID}`,
    roleReps,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );
}





// Update user details

export async function updateUser(
  userId: string,
  updateData: any
): Promise<any> {
  const token = await getAccessToken();
  const payload = updateUserPayload(updateData);

  try {
    // 1Update base user info
    await axios.put(
      `${KEYCLOAK_BASE_URL}/admin/realms/${REALM}/users/${userId}`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    // 2Update client roles (optional)
    if (updateData.clientRoles) {
      await updateClientRoles(
        token!, // token is guaranteed to be defined here, but you can handle it more gracefully if needed
        userId,
        updateData.clientRoles.clientId,
        updateData.clientRoles.roles
      );
    }

    return {
      code: 200,
      message: `User updated ${userId}`,
    };
  } catch (error: any) {
    return {
      code: error.response?.status || 500,
      message: error.message,
      data: error.response?.data,
    };
  }
}


// Get Roles of a user
export async function getUserRoles(userId: string) {
  const token = await getAccessToken();

  // Realm roles
  const realmRolesResponse = await get(
    `${KEYCLOAK_BASE_URL}/admin/realms/${REALM}/users/${userId}/role-mappings/realm`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  // Client roles - optional: fetch for a specific client
  // Example: clientId = "senvion"

  ///TODO : Assign proper Type safety with response from Keycloak Documentation
  const clientsResponse = (await get(
    `${KEYCLOAK_BASE_URL}/admin/realms/${REALM}/clients?clientId=${CLIENT_NAME}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )) as any;

  const clientId = clientsResponse.data[0]?.id as any;

  let clientRoles = [];
  if (clientId) {
    const clientRolesResponse = await get(
      `${KEYCLOAK_BASE_URL}/admin/realms/${REALM}/users/${userId}/role-mappings/clients/${clientId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    clientRoles = clientRolesResponse.data as Array<any> | any;
  }

  return {
    realmRoles: realmRolesResponse.data,
    clientRoles,
  };
}

// Get the roles for multiple users
export async function getAllUsersRoles(userIds: any[]): Promise<any> {
  const rolesMap: any = {};

  await Promise.all(
    userIds.map(async (userId) => {
      try {
        rolesMap[userId] = await getUserRoles(userId);
      } catch (error) {
        // If user not found or error, return default empty roles
        rolesMap[userId] = { realmRoles: [], clientRoles: [] };
      }
    })
  );

  return rolesMap;
}
