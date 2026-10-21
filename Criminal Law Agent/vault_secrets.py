"""Load this agent's API keys from HashiCorp Vault into the environment.

With Vault in use, .env holds only the AppRole login:

    VAULT_ADDR=http://127.0.0.1:8200
    VAULT_ROLE_ID=...
    VAULT_SECRET_ID=...
    VAULT_SECRET_PATH=<agent path>      # KV v2 path under the judicial-ai mount

Without VAULT_ROLE_ID / VAULT_SECRET_ID this does nothing, so keys placed
directly in .env keep working. Variables already set in the environment
always win over Vault.
"""

import os

VAULT_MOUNT = "judicial-ai"


def load_vault_secrets() -> None:
    role_id = os.getenv("VAULT_ROLE_ID")
    secret_id = os.getenv("VAULT_SECRET_ID")
    if not role_id or not secret_id:
        return

    import hvac

    path = os.getenv("VAULT_SECRET_PATH", "python-agents")
    try:
        client = hvac.Client(url=os.getenv("VAULT_ADDR", "http://127.0.0.1:8200"))
        if client.sys.is_sealed():
            print("[vault] Vault is sealed - run `vault operator unseal` (3 keys). Using environment only.")
            return
        client.auth.approle.login(role_id=role_id, secret_id=secret_id)
        secrets = client.secrets.kv.v2.read_secret_version(
            mount_point=VAULT_MOUNT,
            path=path,
            raise_on_deleted_version=True,
        )["data"]["data"]
    except Exception as exc:
        print(f"[vault] Could not load {VAULT_MOUNT}/{path}: {exc}. Using environment only.")
        return

    for key, value in secrets.items():
        os.environ.setdefault(key, str(value))
    print(f"[vault] Loaded {len(secrets)} secret(s) from {VAULT_MOUNT}/{path}.")
