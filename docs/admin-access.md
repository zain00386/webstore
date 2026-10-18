# Admin access

## Signing in

Go to **/admin/login** (on your computer: <http://localhost:3000/admin/login>) and sign in
with your admin email and password. There is no sign-up page; only accounts listed in the
database's `admin_users` table can enter.

## How the admin area is protected

| Layer | What it does |
| --- | --- |
| `src/proxy.ts` | Refreshes the login session and sends visitors who aren't signed in to the login page. A fast first filter only. |
| `requireAdmin()` | Runs on the server in **every** admin page (and every admin action from Phase 6): asks Supabase to verify the session token, then checks `admin_users`. |
| Database security rules | Even with a valid login, the database only lets admins read orders/settings or change books. |

Sign-in requests are only accepted from the shop's own pages. 5 wrong passwords for the same
email (from the same network) in 15 minutes pauses sign-in for that email; Supabase also limits
sign-in attempts on its side. Non-admin accounts that sign in are signed straight back out.

## Common tasks

| Task | How |
| --- | --- |
| Add another admin | `npm.cmd run db:create-admin` (asks for the email, shows a new password once) |
| Change an admin's email | `npm.cmd run db:change-admin-email` (password unchanged) |
| Forgot the password | Supabase → **Authentication → Users** → click the user → **Send password recovery**. Or delete the user there and run `db:create-admin` again. |
| Remove an admin | Supabase SQL Editor: `delete from public.admin_users where user_id = '...';` (they can no longer enter). |
| Test admin security | With the site running: `npm.cmd run e2e:admin`. It creates two temporary accounts, tests every path, then deletes them. |
