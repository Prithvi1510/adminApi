const express = require('express');
const axios = require('axios');
require('dotenv').config(); // Load environment variables

const app = express();
app.use(express.json());

// Keycloak details from .env
const KEYCLOAK_BASE_URL = process.env.KEYCLOAK_BASE_URL;
const REALM = process.env.REALM;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const PORT = process.env.PORT || 3000;

// Function to get access token
async function getAccessToken() {
  const tokenUrl = `${KEYCLOAK_BASE_URL}/realms/${REALM}/protocol/openid-connect/token`;

  const params = new URLSearchParams();
  params.append('client_id', CLIENT_ID);
  params.append('client_secret', CLIENT_SECRET);
  params.append('grant_type', 'client_credentials');

  const response = await axios.post(tokenUrl, params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  return response.data.access_token;
}

app.get('/keycloak-users', async (req, res) => {
  try {
    const token = await getAccessToken();

    const usersResponse = await axios.get(
      `${KEYCLOAK_BASE_URL}/admin/realms/${REALM}/users`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    res.json(usersResponse.data);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
