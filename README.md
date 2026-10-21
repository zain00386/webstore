# Dogar's Unique Books Rawalpindi: online shop

Online bookshop for the official Rawalpindi branch of Dogar Publishers (Iqbal Road, Committee Chowk).
Built with Next.js 16, Supabase (database, admin login, images) and Tailwind CSS.

## Everyday commands (VS Code terminal)

| Command | What it does |
| --- | --- |
| `npm.cmd run dev` | Run the shop on your computer at http://localhost:3000 |
| `npm.cmd run db:check` | Check the database is set up correctly |
| `npm.cmd run db:reset-admin-password` | Give an admin a new password |
| `npm.cmd run db:change-admin-email` | Change an admin's email |
| `npm.cmd run db:create-admin` | Add another admin |
| `npm.cmd test` | Run the automatic tests |
| `npm.cmd run e2e:all` | Run every browser test (shop must be running) |
| `npm.cmd run build` | Build the live version (checks everything compiles) |

## Guides

| Guide | For |
| --- | --- |
| [docs/deployment.md](docs/deployment.md) | Putting the shop online with Vercel, domain, HTTPS |
| [docs/acceptance-test.md](docs/acceptance-test.md) | Checking every feature yourself, step by step |
| [docs/go-live-checklist.md](docs/go-live-checklist.md) | Accounts, settings, security summary, backups |
| [docs/feature-status.md](docs/feature-status.md) | What is complete, partial and not built |
| [docs/database-setup.md](docs/database-setup.md) | Supabase setup and later database updates |
| [docs/admin-access.md](docs/admin-access.md) | Admin accounts and access |
| [docs/notifications.md](docs/notifications.md) | Connecting SMS / email later |
| [docs/known-limitations.md](docs/known-limitations.md) | Known limitations |

Secrets (Supabase keys) live only in `.env.local` (never committed) and in Vercel's settings.
