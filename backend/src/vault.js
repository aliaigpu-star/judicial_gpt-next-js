const Vault = require('node-vault');

const vault = Vault({
  apiVersion: 'v1',
  endpoint: process.env.VAULT_ADDR || 'http://127.0.0.1:8200'
});

async function loadBackendSecrets() {
  try {
    // 1. Authenticate with AppRole
    const result = await vault.approleLogin({
      role_id: process.env.VAULT_ROLE_ID,
      secret_id: process.env.VAULT_SECRET_ID
    });
    
    vault.token = result.auth.client_token;

    // 2. Read the backend secrets (Note: v2 KV engines append 'data' to the path)
    const response = await vault.read('judicial-ai/data/backend-config');
    console.log("Vault: Successfully loaded Backend Secrets into memory.");
    
    return response.data.data;
  } catch (err) {
    console.warn("⚠️ Vault Authentication/Connection Failed:", err.message);
    console.warn("⚠️ Falling back to local .env variables instead of Vault.");
    return null; // Return null instead of crashing, allowing server.js to fallback to .env
  }
}

module.exports = { loadBackendSecrets };
