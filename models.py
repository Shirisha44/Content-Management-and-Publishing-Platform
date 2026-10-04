from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from database import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("role IN ('reader', 'writer', 'admin')", name="ck_users_role"),
    )

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, nullable=False, index=True)
    email = Column(String(254), unique=True, nullable=True, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(16), nullable=False, default="reader", server_default="reader")
    password_reset_token_hash = Column(String(64), nullable=True)
    password_reset_expires_at = Column(DateTime(timezone=True), nullable=True)


class Blog(Base):
    __tablename__ = "blogs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    cover_image_url = Column(String(500), nullable=True)
    cover_image_alt = Column(String(250), nullable=True)
    background_image_url = Column(String(500), nullable=True)
    background_image_alt = Column(String(250), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
    author_id = Column(
        Integer,
        ForeignKey("users.id", name="fk_blogs_author_id_users", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    status = Column(String(16), nullable=False, default="draft", server_default="draft")

    __table_args__ = (
        CheckConstraint(
            "status IN ('draft', 'published')",
            name="ck_blogs_status",
        ),
    )


class Like(Base):
    __tablename__ = "likes"
    __table_args__ = ()

    user_id = Column(
        Integer,
        ForeignKey("users.id", name="fk_likes_user_id_users", ondelete="CASCADE"),
        primary_key=True,
    )
    blog_id = Column(
        Integer,
        ForeignKey("blogs.id", name="fk_likes_blog_id_blogs", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class Bookmark(Base):
    __tablename__ = "bookmarks"
    __table_args__ = ()

    user_id = Column(
        Integer,
        ForeignKey("users.id", name="fk_bookmarks_user_id_users", ondelete="CASCADE"),
        primary_key=True,
    )
    blog_id = Column(
        Integer,
        ForeignKey("blogs.id", name="fk_bookmarks_blog_id_blogs", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())