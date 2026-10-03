# Inkwell — Blog Publishing Platform

A small full-stack publishing app: a FastAPI and SQLAlchemy backend with a responsive React interface. Visitors can browse, search, and page through stories. Demo editor access enables creating, updating, and deleting posts.

## Stack

- **Frontend:** React, Vite, Lucide
- **Backend:** FastAPI, SQLAlchemy, Pydantic
- **Database:** SQLite by default; set `DATABASE_URL` to use another SQLAlchemy-supported database

## Run locally

### 1. Start the API

From the project root, create the local environment file and replace its example values with private credentials:

```powershell
Copy-Item .env.example .env
```

Set `JWT_SECRET_KEY` to a random secret of at least 32 characters, and set a private `ADMIN_USERNAME` and `ADMIN_PASSWORD` (at least 12 characters). For example, generate a random JWT secret with:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Keep `.env` private; it is ignored by Git. Then install the dependencies and start the API:

```powershell
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload
```

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

## Using the app

- Browse and search stories from the journal page.
- Click a story to read it in the side panel.
- Select **Enable editor** and sign in with the configured editor credentials.
- In editor mode, write, edit, and delete stories.

> **Deployment note:** authentication is for one editor configured through environment variables; it is not a user-registration or multi-user account system. Before public deployment, use HTTPS, keep environment secrets private, and configure deployment-specific protections such as rate limiting and secure secret management.

## API overview

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/` | API health message |
| `POST` | `/login` | Issue demo editor token |
| `GET` | `/blogs` | List/search/page stories |
| `GET` | `/blogs/{id}` | Fetch one story |
| `POST` | `/blogs` | Create a story (bearer token required) |
| `PUT` | `/blogs/{id}` | Update a story (bearer token required) |
| `DELETE` | `/blogs/{id}` | Delete a story (bearer token required) |
