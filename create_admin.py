from getpass import getpass

from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError

import models
from auth import hash_password
from database import SessionLocal
from schemas import RegisterRequest


def main() -> None:
    username = input("Admin username: ").strip()
    password = getpass("Admin password: ")

    try:
        credentials = RegisterRequest(username=username, password=password)
    except ValidationError as exc:
        raise SystemExit(f"Invalid admin credentials: {exc}") from exc

    if len(credentials.password.encode("utf-8")) > 72:
        raise SystemExit("Password must be at most 72 UTF-8 bytes for bcrypt")

    with SessionLocal() as db:
        if db.query(models.User).filter(models.User.username == credentials.username).first():
            raise SystemExit("That username already exists; choose another admin username")

        db.add(
            models.User(
                username=credentials.username,
                password_hash=hash_password(credentials.password),
                role="admin",
            )
        )
        try:
            db.commit()
        except IntegrityError as exc:
            db.rollback()
            raise SystemExit("That username was registered concurrently; no admin was created") from exc

    print(f"Admin account '{credentials.username}' created.")


if __name__ == "__main__":
    main()
