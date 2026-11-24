import os
import smtplib
import logging
from typing import Dict, Any, Optional
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings

logger = logging.getLogger("bandhsetu.services.email")


class EmailService:
    """
    100% Free Lifetime Email Delivery Service for BandhSetu.
    Uses standard SMTP (e.g. Gmail SMTP, Brevo, or custom SMTP server).
    Dispatches branded luxury HTML OTP templates to manager/admin email addresses.
    """

    @staticmethod
    def mask_email(email: str) -> str:
        """
        Masks the middle of an email address for privacy and security.
        Example: 'jiya.vinchhi2412@gmail.com' -> 'j***2@gmail.com'
        """
        if not email or "@" not in email:
            return email
        parts = email.split("@")
        name, domain = parts[0], parts[1]
        if len(name) <= 2:
            masked_name = name[0] + "***"
        else:
            masked_name = name[0] + "***" + name[-1]
        return f"{masked_name}@{domain}"

    @classmethod
    def generate_otp_html(cls, recipient_name: str, otp: str) -> str:
        """Generates a luxury BandhSetu branded HTML email template for password reset."""
        return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset OTP — BandhSetu</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FFF9F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #30232A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FFF9F6; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #FFFFFF; border-radius: 24px; border: 1px solid #F0E1E1; overflow: hidden; box-shadow: 0 4px 20px rgba(162, 13, 56, 0.05);">
          
          <!-- Brand Header -->
          <tr>
            <td style="background-color: #A20D38; padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; font-family: Georgia, 'Times New Roman', serif; color: #FFFFFF; font-size: 28px; font-weight: bold; letter-spacing: 0.5px;">BandhSetu</h1>
              <p style="margin: 6px 0 0; color: #FCEDEC; font-size: 13px; letter-spacing: 1.5px; text-transform: uppercase;">Smarter Bandhej Management</p>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 36px 32px 28px;">
              <h2 style="margin: 0 0 12px; color: #30232A; font-size: 18px; font-weight: 700;">Password Reset Verification</h2>
              <p style="margin: 0 0 20px; color: #786773; font-size: 14px; line-height: 1.6;">
                Hello <strong>{recipient_name}</strong>,<br>
                We received a request to reset your password for your BandhSetu workshop account. Use the 6-digit verification code below to proceed:
              </p>

              <!-- OTP Box -->
              <div style="background-color: #FFF9F6; border: 2px dashed #A20D38; border-radius: 16px; padding: 24px 16px; text-align: center; margin: 24px 0;">
                <p style="margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #A20D38; font-weight: bold;">One-Time Verification Code</p>
                <div style="font-family: 'Courier New', Courier, monospace; font-size: 40px; font-weight: 800; letter-spacing: 12px; color: #A20D38; margin: 6px 0;">
                  {otp}
                </div>
                <p style="margin: 6px 0 0; font-size: 12px; color: #786773;">⏱️ Valid for <strong>5 minutes</strong></p>
              </div>

              <!-- Security Information Note -->
              <div style="background-color: #FCEDEC; border-radius: 12px; padding: 14px 16px; margin: 20px 0;">
                <p style="margin: 0; color: #880D32; font-size: 12px; line-height: 1.5;">
                  <strong>Security Note:</strong> Never share this code with anyone. Once your password is reset, all existing login sessions across devices will be automatically invalidated.
                </p>
              </div>

              <p style="margin: 20px 0 0; color: #786773; font-size: 12px; line-height: 1.5;">
                If you did not request this password reset, you can safely ignore this email. Your account remains secure.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top: 1px solid #F0E1E1; padding: 20px 32px; text-align: center; background-color: #FCEDEC/20;">
              <p style="margin: 0; color: #786773; font-size: 11px; line-height: 1.6;">
                © 2026 BandhSetu | All Rights Reserved | Made with ❤️ by Jiya Vinchhi
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    @classmethod
    def send_otp_email(
        cls,
        to_email: str,
        recipient_name: str,
        otp: str
    ) -> Dict[str, Any]:
        """
        Dispatches an OTP verification code via SMTP email.
        If SMTP credentials are not yet configured in .env, cleanly logs to system logger.
        """
        clean_email = to_email.strip().lower()
        masked = cls.mask_email(clean_email)
        subject = f"{otp} is your BandhSetu password reset code"

        smtp_user = settings.SMTP_USER or os.getenv("SMTP_USER")
        smtp_password = settings.SMTP_PASSWORD or os.getenv("SMTP_PASSWORD")
        smtp_host = settings.SMTP_HOST or os.getenv("SMTP_HOST", "smtp.gmail.com")
        smtp_port = int(settings.SMTP_PORT or os.getenv("SMTP_PORT", 587))
        from_email = settings.SMTP_FROM_EMAIL or smtp_user or "no-reply@bandhsetu.internal"
        from_name = settings.SMTP_FROM_NAME or "BandhSetu Security"

        # If live SMTP credentials are configured, send live email!
        if smtp_user and smtp_password:
            try:
                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                msg["From"] = f"{from_name} <{from_email}>"
                msg["To"] = clean_email

                # Plain text version
                text_content = (
                    f"Hello {recipient_name},\n\n"
                    f"Your BandhSetu password reset verification code is: {otp}\n\n"
                    f"This code is valid for 5 minutes. Never share this code with anyone.\n"
                    f"All existing login sessions will be invalidated after password reset.\n\n"
                    f"© 2026 BandhSetu — Smarter Bandhej Management"
                )
                html_content = cls.generate_otp_html(recipient_name, otp)

                msg.attach(MIMEText(text_content, "plain"))
                msg.attach(MIMEText(html_content, "html"))

                if settings.SMTP_SSL or smtp_port == 465:
                    with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=8) as server:
                        server.login(smtp_user, smtp_password)
                        server.send_message(msg)
                else:
                    with smtplib.SMTP(smtp_host, smtp_port, timeout=8) as server:
                        if settings.SMTP_TLS:
                            server.starttls()
                        server.login(smtp_user, smtp_password)
                        server.send_message(msg)

                logger.info(f"[Email Gateway] Live OTP email delivered successfully to {masked}")
                return {
                    "delivered": True,
                    "provider": "smtp",
                    "masked_email": masked,
                    "live": True
                }

            except Exception as e:
                logger.error(f"[Email Gateway] Live SMTP email dispatch failed: {e}. Falling back to dev logger.")

        # Development / Fallback logging
        logger.info(f"============================================================")
        logger.info(f"[EMAIL GATEWAY] Delivering OTP email to {masked} ({clean_email}):")
        logger.info(f"               Recipient: {recipient_name}")
        logger.info(f"               OTP CODE : {otp} (Valid for 5 minutes)")
        logger.info(f"============================================================")

        return {
            "delivered": True,
            "provider": "system_logger",
            "masked_email": masked,
            "live": False
        }

    @classmethod
    def is_configured(cls) -> bool:
        """Checks whether live SMTP credentials are fully populated."""
        user = settings.SMTP_USER or os.getenv("SMTP_USER")
        pwd = settings.SMTP_PASSWORD or os.getenv("SMTP_PASSWORD")
        return bool(user and pwd and user.strip() and pwd.strip())

    @classmethod
    def test_smtp_connection(
        cls,
        smtp_user: str,
        smtp_password: str,
        smtp_host: str = "smtp.gmail.com",
        smtp_port: int = 587,
        smtp_tls: bool = True
    ) -> Dict[str, Any]:
        """
        Tests connection and authentication with the SMTP server.
        Raises smtplib.SMTPAuthenticationError or other exceptions on failure.
        """
        clean_user = smtp_user.strip()
        clean_pwd = smtp_password.strip().replace(" ", "").replace("-", "")

        with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
            if smtp_tls:
                server.starttls()
            server.login(clean_user, clean_pwd)

        return {"connected": True, "user": clean_user}

    @classmethod
    def update_env_file(cls, key_values: Dict[str, str]) -> bool:
        """
        Safely updates or appends environment variables to backend/.env file
        and updates active in-memory settings.
        """
        try:
            # Determine path to backend/.env
            current_dir = os.path.dirname(os.path.abspath(__file__))
            backend_dir = os.path.dirname(os.path.dirname(current_dir))
            env_path = os.path.join(backend_dir, ".env")

            existing_lines = []
            if os.path.exists(env_path):
                with open(env_path, "r", encoding="utf-8") as f:
                    existing_lines = f.readlines()

            updated_keys = set()
            new_lines = []

            for line in existing_lines:
                stripped = line.strip()
                if stripped and not stripped.startswith("#") and "=" in stripped:
                    key = stripped.split("=", 1)[0].strip()
                    if key in key_values:
                        new_lines.append(f"{key}={key_values[key]}\n")
                        updated_keys.add(key)
                        continue
                new_lines.append(line)

            # Append any keys that weren't already in .env
            for key, val in key_values.items():
                if key not in updated_keys:
                    new_lines.append(f"{key}={val}\n")

            with open(env_path, "w", encoding="utf-8") as f:
                f.writelines(new_lines)

            # Sync active in-memory settings & environment
            for key, val in key_values.items():
                os.environ[key] = str(val)
                if hasattr(settings, key):
                    if key == "SMTP_PORT":
                        setattr(settings, key, int(val))
                    elif key in ("SMTP_TLS", "SMTP_SSL"):
                        setattr(settings, key, str(val).lower() in ("true", "1", "yes"))
                    else:
                        setattr(settings, key, str(val))

            return True
        except Exception as e:
            logger.error(f"Failed to update .env file: {e}")
            return False

