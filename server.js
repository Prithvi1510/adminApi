const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// Keycloak details
const KEYCLOAK_BASE_URL = 'http://localhost:8080';
const REALM = 'master';
const CLIENT_ID = 'my-service-account'; 
const CLIENT_SECRET = '5grVRqrHl0J6cBcr99YjTc5ku1FFg0e4'; 

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

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
