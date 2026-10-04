# Content-Management-and-Publishing-Platform

## Inkwell — Blog Publishing Platform

A full-stack publishing app: a FastAPI and SQLAlchemy backend with a responsive React interface. Anyone can browse published stories; registered users can have reader, writer, or admin roles.

## Stack

- **Frontend:** React, Vite, Lucide
- **Backend:** FastAPI, SQLAlchemy, Pydantic
- **Database:** SQLite locally; PostgreSQL recommended for deployed instances, managed with Alembic

## Run locally

### 1. Start the API

From the project root, create the local environment file and replace the JWT placeholder with a private random secret:

```powershell
Copy-Item .env.example .env
```

Set `JWT_SECRET_KEY` to a random secret of at least 32 characters. For example, generate one locally with:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Keep `.env` private; it is ignored by Git. Install dependencies, migrate the database, explicitly create the first admin account, and start the API:

```powershell
python -m pip install -r requirements.txt
alembic upgrade head
python -m create_admin
python -m uvicorn main:app --reload
```

The admin command prompts interactively for a username and password. Passwords are stored as bcrypt hashes. API startup does not create accounts automatically. Public registration offers reader or writer; admin accounts must be created explicitly or promoted by an existing admin.

For password recovery, set `FRONTEND_URL` and configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, `SMTP_USERNAME`, and `SMTP_PASSWORD` in `.env` using your mail provider's SMTP settings. SMTP uses STARTTLS; username and password may both be empty only if the provider allows unauthenticated relay. Never commit SMTP credentials. New accounts require a recovery email. Existing accounts can add or update one from Profile after confirming their current password. Reset links expire after 30 minutes and can be used only once.

Before applying a migration to an existing database, back it up. The story-workflow migration maps existing author usernames to user IDs where possible, changes existing author roles to writer, and keeps existing stories published. Stories without a matching account remain published without an owner and can be managed by an admin.

The API runs at `http://127.0.0.1:8000`; interactive API docs are at `http://127.0.0.1:8000/docs`.

### 2. Start the React app

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal (normally `http://localhost:5173`).

To point the frontend at a different backend, define `VITE_API_URL` in `frontend/.env.local`, for example:

```text
VITE_API_URL=http://127.0.0.1:8000
```

For deployment, use a persistent hosted PostgreSQL database and set its connection string as `DATABASE_URL` in the host's environment settings. Set `CORS_ORIGINS` to a comma-separated list of the deployed frontend origins. Run `alembic upgrade head` against that database before starting the API. Do not commit database credentials. Hosted providers' free-tier limits and persistence policies can change; check the provider's current terms before choosing one.

## Using the app

- Anyone can browse, search, and read published stories without signing in.
- Create a reader or writer account. If no role is supplied, registration defaults to `reader`; public registration cannot create admins.
- Accounts register with a recovery email. If you forget your password, select "Forgot password" on the sign-in page and follow the one-time link sent by email. Existing accounts can add a recovery email in Profile.
- Signed-in readers and writers can like and bookmark published stories. View bookmarks through the signed-in account endpoint.
- Readers can read published stories but cannot create, edit, or delete stories. Writers can read published stories and create drafts or publish stories, and can edit or delete only their own stories. Drafts are visible only to the owner and admins.
- Admins can read and manage any story, including drafts, and can manage members.
- Accounts can be permanently deleted from Profile after confirming the current password. Published stories remain available without an owner, drafts remain private to admins, and the deleted account's bookmarks and likes are removed. The last admin cannot delete their own account.
- The story editor is visual, so writers can format content without typing Markdown syntax. Its toolbar supports headings, bold, italic, underline, strikethrough, highlights, text colors, emoji, font family, size, and weight, as well as links, lists, block quotes, and inline images. Existing Markdown stories remain readable and can be opened for editing.
- Writers and admins can upload cover images, story background images, and pictures within story content. JPEG, PNG, GIF, and WebP images up to 5 MB are supported; uploaded files are stored in the API's `uploads/` directory. Keep this directory on persistent storage and include it in backups when deploying.

> **Deployment note:** public registration has no email verification or rate limiting yet. Use HTTPS, keep secrets private, and add deployment-specific protections before exposing the service publicly.

## API overview

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/` | API health message |
| `POST` | `/register` | Create a reader or writer account (`reader` by default; no public admin signup) |
| `POST` | `/login` | Sign in and receive a bearer token |
| `POST` | `/password/forgot` | Request a one-time password reset link by email |
| `POST` | `/password/reset` | Set a new password with a valid reset token |
| `GET` | `/users/me` | Get the signed-in user's profile |
| `DELETE` | `/users/me` | Permanently delete the signed-in account (current password required) |
| `POST` | `/images` | Upload an image (writer/admin; JPEG, PNG, GIF, or WebP up to 5 MB) |
| `PATCH` | `/users/me/email` | Add/update the recovery email (current password required) |
| `GET` | `/users/me/bookmarks` | List the signed-in user's bookmarks |
| `GET` | `/users` | List users (admin only) |
| `PATCH` | `/users/{user_id}/role` | Change a user's role (admin only) |
| `GET` | `/blogs` | Public list/search/pagination of published stories |
| `GET` | `/blogs/{id}` | Fetch a published story; drafts are owner/admin-only |
| `GET` | `/writer/stories` | List the signed-in writer's stories, including drafts |
| `POST` | `/blogs` | Create a writer-owned story (draft by default; writer/admin) |
| `PUT` | `/blogs/{id}` | Update an owned story (writer) or any story (admin), including status |
| `DELETE` | `/blogs/{id}` | Delete an owned story (writer) or any story (admin) |
| `POST` / `DELETE` | `/blogs/{id}/like` | Like or unlike a published story (authenticated) |
| `POST` / `DELETE` | `/blogs/{id}/bookmark` | Bookmark or remove a bookmark for a published story (authenticated) |
