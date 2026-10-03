import os
import smtplib
import ssl
from email.message import EmailMessage

from dotenv import load_dotenv

load_dotenv()


class EmailDeliveryError(Exception):
    pass


def send_password_reset_email(recipient: str, reset_url: str) -> None:
    host = os.getenv("SMTP_HOST", "").strip()
    sender = os.getenv("SMTP_FROM", "").strip()
    username = os.getenv("SMTP_USERNAME", "").strip()
    password = os.getenv("SMTP_PASSWORD", "")
    port_value = os.getenv("SMTP_PORT", "587")
    if not host or not sender:
        raise EmailDeliveryError("SMTP_HOST and SMTP_FROM must be configured")
    if bool(username) != bool(password):
        raise EmailDeliveryError("SMTP_USERNAME and SMTP_PASSWORD must both be configured")
    try:
        port = int(port_value)
    except ValueError as error:
        raise EmailDeliveryError("SMTP_PORT must be a valid port number") from error
    if not 1 <= port <= 65535:
        raise EmailDeliveryError("SMTP_PORT must be between 1 and 65535")

    message = EmailMessage()
    message["Subject"] = "Reset your Inkwell password"
    message["From"] = sender
    message["To"] = recipient
    message.set_content(
        "We received a request to reset your Inkwell password.\n\n"
        f"Use this one-time link within 30 minutes:\n{reset_url}\n\n"
        "If you did not request this, you can ignore this email."
    )

    try:
        with smtplib.SMTP(host, port, timeout=10) as smtp:
            smtp.starttls(context=ssl.create_default_context())
            if username:
                smtp.login(username, password)
            smtp.send_message(message)
    except (OSError, smtplib.SMTPException) as error:
        raise EmailDeliveryError("Could not send the password reset email") from error
