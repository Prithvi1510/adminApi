import { post, get } from 'axios';
require('dotenv').config();
import {UserRepresentation} from '../types/Keycloak.userRepresentation.ts'
import { TokenResponse } from '../types/Keycloak.tokenResponse.ts';

const { KEYCLOAK_BASE_URL, REALM, CLIENT_ID, CLIENT_SECRET } = process.env;

interface createUserBody {
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  password?: string; 
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
      : undefined
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
  return usersResponse.data;
}

//https://www.keycloak.org/docs-api/latest/rest-api/index.html#_users

export async function createUser(userData: createUserBody): Promise<any> {
  const token = await getAccessToken();

  try{
    const response = await axios.post(
      `${KEYCLOAK_BASE_URL}/admin/realms/${REALM}/users`,
      userData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.status === 201) {
        return {
          success: true,
          status: 201,
          message: 'User created successfully'
        };
      }

      return {
        success: false,
        status: response.status,
        message: `Unexpected response: ${response.status}`
      };
    }
  catch (error : any){ 
      return{ 
        success : false, 
        status : 500, 
        message : `An Error Occured ${error}`
      }
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
      return { code: 204, message: 'No Content' };
    } else {
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

    return {
      code: response.status,
      message: response.statusText,
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
