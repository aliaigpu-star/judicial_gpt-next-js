# ☁️ Cloudflare Setup — JudicialGPT

### Completed Configurations

- Added domain (`judicialgpt.org`) to Cloudflare.
- Updated Namecheap nameservers to route through Cloudflare (`dax.ns.cloudflare.com`, `mia.ns.cloudflare.com`).
- Configured Cloudflare DNS records (A and CNAME) to proxy traffic (orange cloud).
- Configured Cloudflare DNS records (MX and TXT) for email delivery (DNS only / grey cloud).
- Implemented SSL/TLS encryption through Cloudflare (Set to Full Strict mode).
- Enforced "Always Use HTTPS" to automatically redirect HTTP traffic to HTTPS.
- Enabled "Automatic HTTPS Rewrites" to fix mixed content issues.
- Configured Minimum TLS Version to 1.2 for enhanced security.
- Implemented Cloudflare Turnstile for bot detection on the login and signup pages.
