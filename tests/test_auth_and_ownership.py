import os
from datetime import datetime, timedelta, timezone

os.environ.setdefault(
    "JWT_SECRET_KEY",
    "pytest-only-secret-key-with-at-least-thirty-two-characters",
)

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import models
from auth import SECRET_KEY, verify_password
from database import Base
import main
from main import app, get_db


@pytest.fixture
def client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    test_session = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=engine)
    app.state.test_session = test_session

    def override_get_db():
        with test_session() as db:
            yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    del app.state.test_session
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def register_and_login(client: TestClient, username: str, role: str) -> str:
    password = "correct-horse-battery-staple"
    response = client.post(
        "/register",
        json={
            "username": username,
            "email": f"{username}@example.test",
            "password": password,
            "role": role,
        },
    )
    assert response.status_code == 201

    login = client.post(
        "/login",
        json={"username": username, "password": password},
    )
    assert login.status_code == 200
    return login.json()["access_token"]


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_signup_hashes_password_and_token_contains_id_and_role(client: TestClient):
    password = "correct-horse-battery-staple"
    registration = client.post(
        "/register",
        json={
            "username": "writer_one",
            "email": "writer_one@example.test",
            "password": password,
            "role": "writer",
        },
    )
    assert registration.status_code == 201
    assert registration.json()["role"] == "writer"

    with client.app.state.test_session() as db:
        user = db.query(models.User).filter_by(username="writer_one").one()
        assert user.password_hash != password
        assert verify_password(password, user.password_hash)

    token_response = client.post(
        "/login",
        json={"username": "writer_one", "password": password},
    )
    assert token_response.status_code == 200
    token_payload = jwt.decode(
        token_response.json()["access_token"],
        SECRET_KEY,
        algorithms=["HS256"],
    )
    assert token_payload["sub"] == str(registration.json()["id"])
    assert token_payload["role"] == "writer"

    invalid_admin_signup = client.post(
        "/register",
        json={
            "username": "public_admin",
            "email": "admin@example.test",
            "password": password,
            "role": "admin",
        },
    )
    assert invalid_admin_signup.status_code == 422


def test_reader_cannot_create_stories(client: TestClient):
    token = register_and_login(client, "reader_one", "reader")
    response = client.post(
        "/blogs",
        headers=auth_header(token),
        json={"title": "Not allowed", "content": "Readers cannot publish."},
    )
    assert response.status_code == 403


def test_reader_writer_and_admin_story_permissions(client: TestClient):
    writer_token = register_and_login(client, "permission_writer", "writer")
    reader_token = register_and_login(client, "permission_reader", "reader")
    story = client.post(
        "/blogs",
        headers=auth_header(writer_token),
        json={"title": "Public story", "content": "A published story.", "status": "published"},
    )
    assert story.status_code == 201
    story_id = story.json()["id"]

    for token in (writer_token, reader_token):
        assert client.get(f"/blogs/{story_id}", headers=auth_header(token)).status_code == 200
        assert client.get("/blogs", headers=auth_header(token)).json()["total"] == 1

    reader_headers = auth_header(reader_token)
    assert client.get("/writer/stories", headers=reader_headers).status_code == 403
    assert client.post(
        "/blogs",
        headers=reader_headers,
        json={"title": "Blocked story", "content": "Readers cannot write."},
    ).status_code == 403
    assert client.put(
        f"/blogs/{story_id}",
        headers=reader_headers,
        json={"title": "Blocked edit", "content": "Readers cannot edit."},
    ).status_code == 403
    assert client.delete(f"/blogs/{story_id}", headers=reader_headers).status_code == 403
    assert client.post(
        "/images",
        headers=reader_headers,
        files={"image": ("story.png", b"\x89PNG\r\n\x1a\nimage", "image/png")},
    ).status_code == 403

    with client.app.state.test_session() as db:
        reader = db.query(models.User).filter_by(username="permission_reader").one()
        reader.role = "admin"
        db.commit()

    admin_headers = auth_header(reader_token)
    admin_story = client.post(
        "/blogs",
        headers=admin_headers,
        json={"title": "Admin story", "content": "Admins can write too."},
    )
    assert admin_story.status_code == 201
    updated = client.put(
        f"/blogs/{story_id}",
        headers=admin_headers,
        json={"title": "Admin edited story", "content": "Admins can manage any story."},
    )
    assert updated.status_code == 200
    assert updated.json()["title"] == "Admin edited story"
    assert len(client.get("/writer/stories", headers=admin_headers).json()) == 2


def test_writer_can_upload_and_use_story_images(client: TestClient):
    token = register_and_login(client, "image_writer", "writer")
    image_bytes = b"\x89PNG\r\n\x1a\nsmall test image"
    upload = client.post(
        "/images",
        headers=auth_header(token),
        files={"image": ("cover.png", image_bytes, "image/png")},
    )
    assert upload.status_code == 201
    image_url = upload.json()["url"]
    image_path = main.UPLOAD_DIR / image_url.rsplit("/", 1)[-1]
    try:
        assert client.get(image_url).content == image_bytes
        created = client.post(
            "/blogs",
            headers=auth_header(token),
            json={
                "title": "Story with images",
                "content": f"Opening paragraph.\n\n![Inside image]({image_url})",
                "status": "published",
                "cover_image_url": image_url,
                "cover_image_alt": "A garden in spring",
                "background_image_url": image_url,
                "background_image_alt": "Soft illustrated garden background",
            },
        )
        assert created.status_code == 201
        assert created.json()["cover_image_url"] == image_url
        assert created.json()["cover_image_alt"] == "A garden in spring"
        assert created.json()["background_image_url"] == image_url
        assert created.json()["background_image_alt"] == "Soft illustrated garden background"
        assert image_url in created.json()["content"]
        assert client.get("/blogs").json()["data"][0]["cover_image_url"] == image_url

        invalid_upload = client.post(
            "/images",
            headers=auth_header(token),
            files={"image": ("not-an-image.png", b"not an image", "image/png")},
        )
        assert invalid_upload.status_code == 415
        invalid_cover = client.post(
            "/blogs",
            headers=auth_header(token),
            json={
                "title": "External cover",
                "content": "Cover URLs must come from the upload endpoint.",
                "cover_image_url": "https://example.test/image.png",
            },
        )
        assert invalid_cover.status_code == 422
    finally:
        image_path.unlink(missing_ok=True)


def test_account_deletion_requires_password_and_preserves_stories(client: TestClient):
    password = "correct-horse-battery-staple"
    token = register_and_login(client, "delete_account", "writer")
    headers = auth_header(token)
    published = client.post(
        "/blogs",
        headers=headers,
        json={"title": "Kept published story", "content": "Still available.", "status": "published"},
    )
    draft = client.post(
        "/blogs",
        headers=headers,
        json={"title": "Kept private draft", "content": "Still private."},
    )
    assert published.status_code == 201
    assert draft.status_code == 201
    assert client.post(f"/blogs/{published.json()['id']}/like", headers=headers).status_code == 200
    assert client.post(f"/blogs/{published.json()['id']}/bookmark", headers=headers).status_code == 200

    assert client.request(
        "DELETE",
        "/users/me",
        headers=headers,
        json={"current_password": "wrong-password"},
    ).status_code == 401
    assert client.get("/users/me", headers=headers).status_code == 200
    deleted = client.request(
        "DELETE",
        "/users/me",
        headers=headers,
        json={"current_password": password},
    )
    assert deleted.status_code == 204
    assert client.get("/users/me", headers=headers).status_code == 401
    assert client.get(f"/blogs/{published.json()['id']}").status_code == 200
    assert client.get(f"/blogs/{draft.json()['id']}").status_code == 404

    with client.app.state.test_session() as db:
        stories = db.query(models.Blog).order_by(models.Blog.id).all()
        assert [(item.status, item.author_id) for item in stories] == [
            ("published", None),
            ("draft", None),
        ]
        assert db.query(models.Like).count() == 0
        assert db.query(models.Bookmark).count() == 0


def test_last_admin_cannot_delete_their_account(client: TestClient):
    password = "correct-horse-battery-staple"
    token = register_and_login(client, "only_admin", "writer")
    with client.app.state.test_session() as db:
        admin = db.query(models.User).filter_by(username="only_admin").one()
        admin.role = "admin"
        db.commit()

    response = client.request(
        "DELETE",
        "/users/me",
        headers=auth_header(token),
        json={"current_password": password},
    )
    assert response.status_code == 409
    assert client.get("/users/me", headers=auth_header(token)).status_code == 200


def test_writer_drafts_are_private_and_ownership_is_enforced(client: TestClient):
    owner_token = register_and_login(client, "writer_owner", "writer")
    other_token = register_and_login(client, "writer_other", "writer")

    created = client.post(
        "/blogs",
        headers=auth_header(owner_token),
        json={"title": "Private draft", "content": "Only its writer should see this."},
    )
    assert created.status_code == 201
    draft_id = created.json()["id"]
    assert created.json()["status"] == "draft"

    public_list = client.get("/blogs")
    assert public_list.status_code == 200
    assert public_list.json()["total"] == 0
    assert client.get(f"/blogs/{draft_id}").status_code == 404
    assert client.get(
        f"/blogs/{draft_id}",
        headers=auth_header(other_token),
    ).status_code == 404
    assert client.get(
        f"/blogs/{draft_id}",
        headers=auth_header(owner_token),
    ).status_code == 200

    dashboard = client.get("/writer/stories", headers=auth_header(owner_token))
    assert dashboard.status_code == 200
    assert [story["id"] for story in dashboard.json()] == [draft_id]

    edit_payload = {
        "title": "Changed title",
        "content": "Changed content.",
        "status": "published",
    }
    assert client.put(
        f"/blogs/{draft_id}",
        headers=auth_header(other_token),
        json=edit_payload,
    ).status_code == 403
    assert client.delete(
        f"/blogs/{draft_id}",
        headers=auth_header(other_token),
    ).status_code == 403

    published = client.put(
        f"/blogs/{draft_id}",
        headers=auth_header(owner_token),
        json=edit_payload,
    )
    assert published.status_code == 200
    assert published.json()["status"] == "published"
    assert client.get(f"/blogs/{draft_id}").status_code == 200
    assert client.post(
        f"/blogs/{draft_id}/like",
        headers=auth_header(owner_token),
    ).json()["active"] is True
    assert client.post(
        f"/blogs/{draft_id}/bookmark",
        headers=auth_header(owner_token),
    ).json()["active"] is True
    engagement = client.get(
        f"/blogs/{draft_id}",
        headers=auth_header(owner_token),
    ).json()
    assert engagement["like_count"] == 1
    assert engagement["is_liked"] is True
    assert engagement["is_bookmarked"] is True
    saved_bookmarks = client.get(
        "/users/me/bookmarks",
        headers=auth_header(owner_token),
    )
    assert [item["id"] for item in saved_bookmarks.json()] == [draft_id]

    assert client.delete(
        f"/blogs/{draft_id}",
        headers=auth_header(owner_token),
    ).status_code == 200
    assert client.get(f"/blogs/{draft_id}").status_code == 404
    assert client.get(
        "/users/me/bookmarks",
        headers=auth_header(owner_token),
    ).json() == []


def test_password_reset_uses_one_time_expiring_tokens(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
):
    import main
    from urllib.parse import parse_qs, urlparse

    captured_urls: list[str] = []
    monkeypatch.setattr(
        main,
        "send_password_reset_email",
        lambda recipient, reset_url: captured_urls.append(reset_url),
    )
    password = "correct-horse-battery-staple"
    registration = client.post(
        "/register",
        json={
            "username": "reset_user",
            "email": "reset_user@example.test",
            "password": password,
            "role": "reader",
        },
    )
    assert registration.status_code == 201

    unknown_email = client.post(
        "/password/forgot",
        json={"email": "missing@example.test"},
    )
    assert unknown_email.status_code == 202
    assert captured_urls == []

    forgot = client.post(
        "/password/forgot",
        json={"email": "RESET_USER@example.test"},
    )
    assert forgot.status_code == 202
    assert len(captured_urls) == 1
    token = parse_qs(urlparse(captured_urls[0]).query)["token"][0]

    new_password = "an-even-better-password-123"
    reset = client.post(
        "/password/reset",
        json={"token": token, "password": new_password},
    )
    assert reset.status_code == 200
    assert client.post(
        "/password/reset",
        json={"token": token, "password": "another-valid-password"},
    ).status_code == 400
    assert client.post(
        "/login",
        json={"username": "reset_user", "password": password},
    ).status_code == 401
    assert client.post(
        "/login",
        json={"username": "reset_user", "password": new_password},
    ).status_code == 200

    assert client.post(
        "/password/forgot",
        json={"email": "reset_user@example.test"},
    ).status_code == 202
    expired_token = parse_qs(urlparse(captured_urls[-1]).query)["token"][0]
    with client.app.state.test_session() as db:
        user = db.query(models.User).filter_by(username="reset_user").one()
        user.password_reset_expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
        db.commit()
    assert client.post(
        "/password/reset",
        json={"token": expired_token, "password": "another-valid-password"},
    ).status_code == 400


def test_existing_account_can_add_recovery_email(client: TestClient):
    password = "correct-horse-battery-staple"
    registration = client.post(
        "/register",
        json={
            "username": "email_update",
            "email": "initial@example.test",
            "password": password,
            "role": "reader",
        },
    )
    token = client.post(
        "/login",
        json={"username": "email_update", "password": password},
    ).json()["access_token"]
    updated = client.patch(
        "/users/me/email",
        headers=auth_header(token),
        json={"email": "NEW@example.test", "current_password": password},
    )
    assert updated.status_code == 200
    assert updated.json()["email"] == "new@example.test"
