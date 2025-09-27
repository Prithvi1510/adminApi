import requests
import random
import string

# Base URL of your API
BASE_URL = "http://localhost:3000/users"

# Example function to generate random string
def random_string(length=6):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

# Example function to generate random user
def generate_user():
    username = "user" + random_string(5)
    email = f"{username}@example.com"
    first_name = "John" + random_string(3)
    last_name = "Doe" + random_string(3)
    password = "TemporaryPass123"
    return {
        "email": email,
        "username": username,
        "firstName": first_name,
        "lastName": last_name,
        "password": password
    }

# Optional: Include token if your API requires authentication
HEADERS = {
    # "Authorization": "Bearer YOUR_TOKEN_HERE",
    "Content-Type": "application/json"
}

# Loop to create 100 users
for i in range(100):
    user_data = generate_user()
    response = requests.post(BASE_URL, json=user_data, headers=HEADERS)
    
    if response.status_code == 201:
        print(f"[{i+1}] User created: {user_data['username']}")
    else:
        print(f"[{i+1}] Failed to create user: {response.status_code} - {response.text}")
