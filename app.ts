import express, { json } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import { TokenResponse } from './types/Keycloak.tokenResponse' ;
import userRouter from './routes/userRoutes'
dotenv.config();

const app = express();
app.use(json());

// Keycloak config
const KEYCLOAK_BASE_URL = process.env.KEYCLOAK_BASE_URL;
const REALM = process.env.REALM;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

// ----------------- Services -----------------
export async function getAccessToken() : Promise<string | undefined>  {
  const tokenUrl = `${KEYCLOAK_BASE_URL}/realms/${REALM}/protocol/openid-connect/token`;

  const params = new URLSearchParams();
  params.append('client_id', CLIENT_ID!);
  params.append('client_secret', CLIENT_SECRET!);
  params.append('grant_type', 'client_credentials');

  const response = await axios.post<TokenResponse> (tokenUrl, params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  return response.data.access_token as any;
}

export async function getAllUsers() {
  const token = await getAccessToken();
  const response = await axios.get(`${KEYCLOAK_BASE_URL}/admin/realms/${REALM}/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

// ----------------- Example Controller for Legacy Checking  -----------------
export const exampleController = {
  async listUsers(req, res) {
    try {
      const users = await getAllUsers();
      res.status(200).json(users);
    } catch (error: any) {
      console.error(error.response?.data || error.message);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  },

  // Add more controllers here for createUser, deleteUser, disableUser
};

// ----------------- Routes -----------------
app.get('/example/listall', exampleController.listUsers);
app.use('/users', userRouter);

export default app;