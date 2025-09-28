import { post, get } from 'axios';
require('dotenv').config();
import {UserRepresentation} from '../types/Keycloak.userRepresentation'
import { TokenResponse } from '../types/Keycloak.tokenResponse';
import axios from 'axios';

const { KEYCLOAK_BASE_URL, REALM, CLIENT_ID, CLIENT_SECRET } = process.env;

interface createUserBody {
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  password?: string; 
  requiredActions?: string[];
}

interface deleteUserBody { 
  realm : string, 
  userid : string
}

interface keycloakAPIResponse { 
  code : any , 
  message : any , 
  Datatype ?: any
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

async function getAccessToken() : Promise<string | undefined>  {
  const tokenUrl = `${KEYCLOAK_BASE_URL}/realms/${REALM}/protocol/openid-connect/token`;

  const params = new URLSearchParams();
  params.append('client_id', CLIENT_ID!);
  params.append('client_secret', CLIENT_SECRET!);
  params.append('grant_type', 'client_credentials');

  const response = await post<TokenResponse>(tokenUrl, params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
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
            type: 'password',
            value: userData.password,
            temporary: true
          }
        ]
      : undefined , 
    requiredActions: userData.requiredActions ? userData.requiredActions :  []
  };
}

//Helper Function to only include certain fields in roles Response 
export function filterRoleFields(roles: any): any {
  const extractNames = (roleArray: any[]) => roleArray.map((r) => r.name);

  return {
      realmRoles: extractNames(roles.realmRoles || []),
      clientRoles: extractNames(roles.clientRoles || []),
  }
};

// ***********************************************************************************************************************
// API Services 
// ***********************************************************************************************************************

export async function getAllUsers() {
  const token = await getAccessToken();
  const usersResponse = await get(
    `${KEYCLOAK_BASE_URL}/admin/realms/${REALM}/users`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return usersResponse.data;
}

export async function getOneUser(userId : string) {
  const token = await getAccessToken();
  try {
    const userResponse = await get(
      `${KEYCLOAK_BASE_URL}/admin/realms/${REALM}/users/${userId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    ) as any;
    const roles = await getUserRoles(userId);
    const roleFields =  filterRoleFields(roles); 

    userResponse.data.realmRoles = roleFields.realmRoles;
    userResponse.data.clientRoles = roleFields.clientRoles;


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


  //https://stackoverflow.com/questions/76174231/keycloak-set-required-actions-for-user
  const actionsList = ["VERIFY_EMAIL", "UPDATE_PROFILE", "CONFIGURE_TOTP", "UPDATE_PASSWORD"]; 

  if (userData.requiredActions && userData.requiredActions.length > 0) {
    payload.requiredActions = userData.requiredActions.filter(action => actionsList.includes(action));
  }

  try {
    const response = await axios.post(
      `${KEYCLOAK_BASE_URL}/admin/realms/${REALM}/users`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.status === 201) {
      return {
        success: true,
        status: 201,
        message: 'User created successfully',
      };
    }

    return {
      success: false,
      status: response.status,
      message: `Unexpected response: ${response.status}`,
    };
  } catch (error: any) {
    // If Keycloak returns a response (like 409), pass it through
    if (error.response) {
      return {
        success: false,
        status: error.response.status,   // e.g., 409 for Conflict
        message: error.response.status == 409  ? "This user or email is already enrolled"  : error.message
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
    }
    else {
      return { code: response.status, message: response.statusText, data: response.data };
    }
  } catch (error: any) {
    if (error.response) {
      const status = error.response.status;
      let message = '';
      switch (status) {
        case 400:
          message = 'Bad Request';
          break;
        case 403:
          message = 'Forbidden';
          break;
        case 404:
          message = 'Not Found';
          break;
        default:
          message = error.response.statusText || 'Error';
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
          'Content-Type': 'application/json',
        },
      }
    );

    return { code: 200 , message: `User is disable ${userId}`, data: response.data || null };

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
    username: userData.username,
    email: userData.email,
    enabled: userData.enabled,
    firstName: userData.firstName,
    lastName: userData.lastName,
    emailVerified: userData.emailVerified,
    credentials: userData.resetPassword
      ? [
          {
            type: 'password',
            value: 'tempass123',
            temporary: true
          }
        ]
      : [] , 
    requiredActions: userData.requiredActions ? userData.requiredActions :  []
  };
}



export async function updateUser(userId: string, updateData: any): Promise<any> {

  const token = await getAccessToken();
  
  try {
    const response = await axios.put(
      `${KEYCLOAK_BASE_URL}/admin/realms/${REALM}/users/${userId}`,
      updateData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return { code: 200 , message: `User is updated ${userId}`, data: response.data || null };

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
  const clientsResponse  = await get(
    `${KEYCLOAK_BASE_URL}/admin/realms/${REALM}/clients?clientId=senvion`,
    { headers: { Authorization: `Bearer ${token}` } }
  ) as any;

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
export async function getAllUsersRoles(userIds: string[]): Promise<any> {
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