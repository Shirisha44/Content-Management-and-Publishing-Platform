import os
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import quote

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

import models
import schemas
from auth import (
    create_token,
    hash_password,
    verify_optional_token,
    verify_password,
    verify_token,
)
from database import SessionLocal
from email_service import EmailDeliveryError, send_password_reset_email

app = FastAPI()

allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.post("/register", response_model=schemas.UserResponse, status_code=201)
def register(request: schemas.RegisterRequest, db: Session = Depends(get_db)):
    if len(request.password.encode("utf-8")) > 72:
        raise HTTPException(status_code=422, detail="Password must be at most 72 UTF-8 bytes")
    if db.query(models.User).filter(models.User.username == request.username).first():
        raise HTTPException(status_code=409, detail="Username is already registered")
    if db.query(models.User).filter(models.User.email == request.email).first():
        raise HTTPException(status_code=409, detail="Email is already registered")

    user = models.User(
        username=request.username,
        email=request.email,
        password_hash=hash_password(request.password),
        role=request.role,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        if db.query(models.User).filter(models.User.username == request.username).first():
            raise HTTPException(status_code=409, detail="Username is already registered")
        raise HTTPException(status_code=409, detail="Email is already registered")
    db.refresh(user)
    return user


@app.post("/login")
def login(credentials: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(
        models.User.username == credentials.username
    ).first()
    if (
        user is None
        or len(credentials.password.encode("utf-8")) > 72
        or not verify_password(credentials.password, user.password_hash)
    ):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    return {
        "access_token": create_token({"sub": str(user.id), "role": user.role}),
        "token_type": "bearer",
        "user": schemas.UserResponse.model_validate(user),
    }


@app.post("/password/forgot", status_code=202)
def request_password_reset(
    request: schemas.PasswordResetRequest,
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.email == request.email).first()
    if user is not None:
        token = secrets.token_urlsafe(32)
        user.password_reset_token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        user.password_reset_expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)
        db.commit()

        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
        reset_url = f"{frontend_url}/reset-password?token={quote(token)}"
        try:
            send_password_reset_email(user.email, reset_url)
        except EmailDeliveryError as error:
            user.password_reset_token_hash = None
            user.password_reset_expires_at = None
            db.commit()
            raise HTTPException(
                status_code=503,
                detail="Password reset email could not be sent. Please try again later.",
            ) from error

    return {"message": "If that email is registered, a password reset link will be sent."}


@app.post("/password/reset")
def reset_password(
    request: schemas.PasswordResetConfirm,
    db: Session = Depends(get_db),
):
    if len(request.password.encode("utf-8")) > 72:
        raise HTTPException(status_code=422, detail="Password must be at most 72 UTF-8 bytes")

    token_hash = hashlib.sha256(request.token.encode("utf-8")).hexdigest()
    user = (
        db.query(models.User)
        .filter(models.User.password_reset_token_hash == token_hash)
        .first()
    )
    if user is None or user.password_reset_expires_at is None:
        raise HTTPException(status_code=400, detail="Reset link is invalid or expired")

    expires_at = user.password_reset_expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= datetime.now(timezone.utc):
        user.password_reset_token_hash = None
        user.password_reset_expires_at = None
        db.commit()
        raise HTTPException(status_code=400, detail="Reset link is invalid or expired")

    user.password_hash = hash_password(request.password)
    user.password_reset_token_hash = None
    user.password_reset_expires_at = None
    db.commit()
    return {"message": "Password reset successfully. You can now sign in."}


def _user_from_payload(payload: dict[str, str] | None, db: Session) -> models.User | None:
    if payload is None:
        return None
    try:
        user_id = int(payload["sub"])
    except (KeyError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid Token")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="Account no longer exists")
    return user


def get_current_user(
    payload: dict[str, str] = Depends(verify_token),
    db: Session = Depends(get_db),
) -> models.User:
    user = _user_from_payload(payload, db)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid Token")
    return user


def get_optional_user(
    payload: dict[str, str] | None = Depends(verify_optional_token),
    db: Session = Depends(get_db),
) -> models.User | None:
    return _user_from_payload(payload, db)


def require_writer_or_admin(
    user: models.User = Depends(get_current_user),
) -> models.User:
    if user.role not in ("writer", "admin"):
        raise HTTPException(status_code=403, detail="Writer or admin role required")
    return user


def require_admin(
    user: models.User = Depends(get_current_user),
) -> models.User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    return user


@app.get("/users/me", response_model=schemas.UserResponse)
def get_my_account(user: models.User = Depends(get_current_user)):
    return user


@app.patch("/users/me/email", response_model=schemas.UserResponse)
def update_recovery_email(
    request: schemas.RecoveryEmailUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if len(request.current_password.encode("utf-8")) > 72 or not verify_password(
        request.current_password,
        user.password_hash,
    ):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    existing_user = (
        db.query(models.User)
        .filter(models.User.email == request.email, models.User.id != user.id)
        .first()
    )
    if existing_user is not None:
        raise HTTPException(status_code=409, detail="Email is already registered")

    user.email = request.email
    user.password_reset_token_hash = None
    user.password_reset_expires_at = None
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Email is already registered")
    db.refresh(user)
    return user


@app.get("/users/me/bookmarks", response_model=list[schemas.BookmarkResponse])
def get_my_bookmarks(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    bookmarks = (
        db.query(models.Bookmark, models.Blog)
        .join(models.Blog, models.Blog.id == models.Bookmark.blog_id)
        .filter(
            models.Bookmark.user_id == user.id,
            models.Blog.status == "published",
        )
        .order_by(models.Bookmark.created_at.desc(), models.Blog.id.desc())
        .all()
    )
    return [
        {
            "id": blog.id,
            "title": blog.title,
            "created_at": bookmark.created_at,
        }
        for bookmark, blog in bookmarks
    ]


@app.get("/users", response_model=list[schemas.UserResponse])
def list_users(
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    return db.query(models.User).order_by(models.User.id).all()


@app.patch("/users/{user_id}/role", response_model=schemas.UserResponse)
def update_user_role(
    user_id: int,
    update: schemas.UserRoleUpdate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "admin" and update.role != "admin":
        admin_count = db.query(models.User).filter(models.User.role == "admin").count()
        if admin_count <= 1:
            raise HTTPException(status_code=409, detail="Cannot demote the last admin")
    user.role = update.role
    db.commit()
    db.refresh(user)
    return user


@app.get("/")
def home():
    return {"message": "Blog API Started"}


def _blog_payload(
    blog: models.Blog,
    db: Session,
    user: models.User | None,
) -> dict:
    payload = schemas.BlogResponse.model_validate(blog).model_dump()
    payload["like_count"] = db.query(models.Like).filter(
        models.Like.blog_id == blog.id
    ).count()
    if user is not None:
        payload["is_liked"] = (
            db.query(models.Like)
            .filter(
                models.Like.user_id == user.id,
                models.Like.blog_id == blog.id,
            )
            .first()
            is not None
        )
        payload["is_bookmarked"] = (
            db.query(models.Bookmark)
            .filter(
                models.Bookmark.user_id == user.id,
                models.Bookmark.blog_id == blog.id,
            )
            .first()
            is not None
        )
    return payload


def _get_blog_or_404(db: Session, blog_id: int) -> models.Blog:
    blog = db.query(models.Blog).filter(models.Blog.id == blog_id).first()
    if blog is None:
        raise HTTPException(status_code=404, detail="Story not found")
    return blog


def _get_published_blog_or_404(db: Session, blog_id: int) -> models.Blog:
    blog = (
        db.query(models.Blog)
        .filter(
            models.Blog.id == blog_id,
            models.Blog.status == "published",
        )
        .first()
    )
    if blog is None:
        raise HTTPException(status_code=404, detail="Story not found")
    return blog


@app.get("/blogs")
def get_blogs(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=5, ge=1, le=50),
    search: str = Query(default=""),
    db: Session = Depends(get_db),
    user: models.User | None = Depends(get_optional_user),
):
    query = db.query(models.Blog).filter(models.Blog.status == "published")
    if search:
        query = query.filter(models.Blog.title.ilike(f"%{search}%"))

    query = query.order_by(models.Blog.created_at.desc(), models.Blog.id.desc())
    total = query.count()
    start = (page - 1) * limit
    blogs = query.offset(start).limit(limit).all()

    return {
        "page": page,
        "limit": limit,
        "total": total,
        "data": [_blog_payload(blog, db, user) for blog in blogs],
    }


@app.get("/writer/stories", response_model=list[schemas.BlogResponse])
def get_writer_stories(
    db: Session = Depends(get_db),
    user: models.User = Depends(require_writer_or_admin),
):
    query = db.query(models.Blog)
    if user.role != "admin":
        query = query.filter(models.Blog.author_id == user.id)
    blogs = query.order_by(
        models.Blog.updated_at.desc(),
        models.Blog.id.desc(),
    ).all()
    return [_blog_payload(blog, db, user) for blog in blogs]


@app.get("/blogs/{id}", response_model=schemas.BlogResponse)
def get_blog(
    id: int,
    db: Session = Depends(get_db),
    user: models.User | None = Depends(get_optional_user),
):
    blog = _get_blog_or_404(db, id)
    if blog.status != "published" and (
        user is None or (user.role != "admin" and blog.author_id != user.id)
    ):
        raise HTTPException(status_code=404, detail="Story not found")
    return _blog_payload(blog, db, user)


@app.post("/blogs", response_model=schemas.BlogResponse, status_code=201)
def create_blog(
    blog: schemas.BlogCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_writer_or_admin),
):
    new_blog = models.Blog(
        title=blog.title,
        content=blog.content,
        author_id=user.id,
        status=blog.status,
    )
    db.add(new_blog)
    db.commit()
    db.refresh(new_blog)
    return _blog_payload(new_blog, db, user)


@app.put("/blogs/{id}", response_model=schemas.BlogResponse)
def update_blog(
    id: int,
    blog: schemas.BlogCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_writer_or_admin),
):
    existing_blog = _get_blog_or_404(db, id)
    if user.role != "admin" and existing_blog.author_id != user.id:
        raise HTTPException(status_code=403, detail="Writers can only update their own stories")

    existing_blog.title = blog.title
    existing_blog.content = blog.content
    existing_blog.status = blog.status
    db.commit()
    db.refresh(existing_blog)
    return _blog_payload(existing_blog, db, user)


@app.delete("/blogs/{id}")
def delete_blog(
    id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_writer_or_admin),
):
    blog = _get_blog_or_404(db, id)
    if user.role != "admin" and blog.author_id != user.id:
        raise HTTPException(status_code=403, detail="Writers can only delete their own stories")

    db.query(models.Like).filter(models.Like.blog_id == blog.id).delete(
        synchronize_session=False,
    )
    db.query(models.Bookmark).filter(models.Bookmark.blog_id == blog.id).delete(
        synchronize_session=False,
    )
    db.delete(blog)
    db.commit()
    return {"message": "Story deleted successfully"}


def _set_engagement(
    db: Session,
    user: models.User,
    blog_id: int,
    model: type[models.Like] | type[models.Bookmark],
    active: bool,
) -> schemas.EngagementResponse:
    _get_published_blog_or_404(db, blog_id)
    relationship = (
        db.query(model)
        .filter(
            model.user_id == user.id,
            model.blog_id == blog_id,
        )
        .first()
    )
    if active and relationship is None:
        db.add(model(user_id=user.id, blog_id=blog_id))
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            relationship = (
                db.query(model)
                .filter(
                    model.user_id == user.id,
                    model.blog_id == blog_id,
                )
                .first()
            )
            if relationship is None:
                raise
    elif not active and relationship is not None:
        db.delete(relationship)
        db.commit()
    return schemas.EngagementResponse(active=active)


@app.post("/blogs/{id}/like", response_model=schemas.EngagementResponse)
def like_blog(
    id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    return _set_engagement(db, user, id, models.Like, True)


@app.delete("/blogs/{id}/like", response_model=schemas.EngagementResponse)
def unlike_blog(
    id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    return _set_engagement(db, user, id, models.Like, False)


@app.post("/blogs/{id}/bookmark", response_model=schemas.EngagementResponse)
def bookmark_blog(
    id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    return _set_engagement(db, user, id, models.Bookmark, True)


@app.delete("/blogs/{id}/bookmark", response_model=schemas.EngagementResponse)
def unbookmark_blog(
    id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    return _set_engagement(db, user, id, models.Bookmark, False)
