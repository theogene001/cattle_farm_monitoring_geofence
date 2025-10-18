Authentication / Demo user removed

The project previously included a demo user and a development convenience that automatically opened the dashboard. That behavior has been removed to avoid accidental exposure of demo credentials.

To create an initial admin user for local development, use the backend helper script in `backend/scripts` or run the Node script directly.

Example (PowerShell):

```powershell
cd backend
node scripts/create_user.js --email admin@cattlefarm.com --name "Admin" --password admin123 --role admin
```

Note: For production, always set secure secrets (JWT_SECRET, SESSION_SECRET) and create accounts manually.

If you want the old demo seeding behavior for quick local testing, set up an explicit seed script or request me to add an env-controlled seeding option (e.g., `SEED_DEMO=1`).
