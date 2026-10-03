import hmac
import os
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

load_dotenv()


def _required_setting(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"{name} must be set in the environment or .env file")
    return value


SECRET_KEY = _required_setting("JWT_SECRET_KEY")
ADMIN_USERNAME = _required_setting("ADMIN_USERNAME")
ADMIN_PASSWORD = _required_setting("ADMIN_PASSWORD")
if len(SECRET_KEY) < 32:
    raise RuntimeError("JWT_SECRET_KEY must contain at least 32 characters")
if len(ADMIN_PASSWORD) < 12:
    raise RuntimeError("ADMIN_PASSWORD must contain at least 12 characters")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

bearer_scheme = HTTPBearer(auto_error=False)


def verify_editor_credentials(username: str, password: str) -> bool:
    username_matches = hmac.compare_digest(username, ADMIN_USERNAME)
    password_matches = hmac.compare_digest(password, ADMIN_PASSWORD)
    return username_matches & password_matches


def create_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Missing bearer token")
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid Token")