from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=64, pattern=r"^[A-Za-z0-9_.-]+$")
    email: str = Field(
        min_length=3,
        max_length=254,
        pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
    )
    password: str = Field(min_length=12, max_length=72)
    role: Literal["reader", "writer"] = "reader"

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str


class PasswordResetRequest(BaseModel):
    email: str = Field(
        min_length=3,
        max_length=254,
        pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
    )

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class PasswordResetConfirm(BaseModel):
    token: str = Field(min_length=32, max_length=128)
    password: str = Field(min_length=12, max_length=72)


class RecoveryEmailUpdate(BaseModel):
    email: str = Field(
        min_length=3,
        max_length=254,
        pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
    )
    current_password: str = Field(min_length=1, max_length=72)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class AccountDeleteRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=72)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str | None
    role: Literal["reader", "writer", "admin"]


class UserRoleUpdate(BaseModel):
    role: Literal["reader", "writer", "admin"]


#Input Schema
class BlogCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1, max_length=100000)
    cover_image_url: str | None = Field(default=None, max_length=500)
    cover_image_alt: str | None = Field(default=None, max_length=250)
    background_image_url: str | None = Field(default=None, max_length=500)
    background_image_alt: str | None = Field(default=None, max_length=250)
    status: Literal["draft", "published"] = "draft"

    @field_validator("cover_image_url")
    @classmethod
    def validate_cover_image_url(cls, value: str | None) -> str | None:
        if value is not None and not value.startswith("/uploads/"):
            raise ValueError("Cover images must be uploaded to this platform")
        return value

    @field_validator("background_image_url")
    @classmethod
    def validate_background_image_url(cls, value: str | None) -> str | None:
        if value is not None and not value.startswith("/uploads/"):
            raise ValueError("Background images must be uploaded to this platform")
        return value

#Output Schema
class BlogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    content: str
    cover_image_url: str | None
    cover_image_alt: str | None
    background_image_url: str | None
    background_image_alt: str | None
    created_at: datetime
    updated_at: datetime
    author_id: int | None
    status: Literal["draft", "published"]
    like_count: int = 0
    is_liked: bool = False
    is_bookmarked: bool = False



class EngagementResponse(BaseModel):
    active: bool


class BookmarkResponse(BaseModel):
    id: int
    title: str
    created_at: datetime