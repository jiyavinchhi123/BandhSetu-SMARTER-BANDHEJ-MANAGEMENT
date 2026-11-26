from datetime import datetime, time, timedelta
import zoneinfo
from typing import Tuple, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User
from app.models.audit_log import AuditLog
from app.utils.formatters import get_current_ist_time, format_ist_datetime

IST = zoneinfo.ZoneInfo("Asia/Kolkata")


class AccessControlService:
    """
    Server-side security service for validating Manager operating hours,
    account lock states, temporary extensions, and audit trails.
    """

    @staticmethod
    def get_ist_now() -> datetime:
        return datetime.now(IST)

    def is_within_operating_hours(
        self,
        user: User,
        current_dt: Optional[datetime] = None,
        db: Optional[Session] = None,
    ) -> Tuple[bool, str]:
        """
        Validates whether a user is currently permitted to access the application
        based on role, lock state, company operational rules, operating window, and extensions in IST.
        Returns: (is_permitted, reason_or_status_message)
        """
        # Admins always have unrestricted 24/7 access
        if user.role == "admin":
            return True, "Admin 24/7 unrestricted access"

        # Check account activation
        if not user.is_active:
            return False, "Manager account has been disabled by Owner."

        # Manual lock strictly overrides any scheduled or extended hours
        if user.is_locked:
            reason = user.lock_reason or "Account locked manually by Owner."
            return False, f"Account is locked: {reason}"

        now_ist = current_dt or self.get_ist_now()

        # Check temporary extension
        if user.temporary_extension_until:
            ext = user.temporary_extension_until
            # Normalize extension datetime to IST
            if ext.tzinfo is None:
                ext_ist = ext.replace(tzinfo=IST)
            else:
                ext_ist = ext.astimezone(IST)

            if now_ist <= ext_ist:
                return True, f"Temporary access extended until {ext_ist.strftime('%I:%M %p IST')}"

        # Check Company-Specific Operational Rules (Operating Days & Hours)
        op_start = user.access_start_time or "08:00"
        op_end = user.access_end_time or "20:00"
        if db is not None and user.business_id:
            try:
                from app.models.company import Company
                comp = db.query(Company).filter(Company.id == user.business_id).first()
                if comp:
                    # 1. Company operating days check (e.g. Mon,Tue,Wed,Thu,Fri,Sat)
                    today_code = now_ist.strftime("%a")  # e.g. Mon, Sun
                    allowed_days = [d.strip() for d in (comp.operating_days or "Mon,Tue,Wed,Thu,Fri,Sat").split(",")]
                    if today_code not in allowed_days and not comp.allow_manager_weekend_access:
                        return (
                            False,
                            f"Company workshop is closed on {now_ist.strftime('%A')} per company operational rules."
                        )
                    # 2. Company operating window override if defined
                    if comp.operating_hours_start and comp.operating_hours_end:
                        op_start = comp.operating_hours_start
                        op_end = comp.operating_hours_end
            except Exception:
                pass

        # Parse start and end times (HH:MM)
        try:
            start_h, start_m = map(int, op_start.split(":"))
            end_h, end_m = map(int, op_end.split(":"))
        except Exception:
            start_h, start_m = 8, 0
            end_h, end_m = 20, 0

        curr_minutes = now_ist.hour * 60 + now_ist.minute
        start_minutes = start_h * 60 + start_m
        end_minutes = end_h * 60 + end_m

        in_window = False
        if start_minutes <= end_minutes:
            in_window = start_minutes <= curr_minutes <= end_minutes
        else:
            # Over-midnight shifts
            in_window = curr_minutes >= start_minutes or curr_minutes <= end_minutes

        if in_window:
            return True, f"Within permitted operating hours ({op_start} - {op_end} IST)"

        # Outside permitted hours
        start_12 = time(start_h, start_m).strftime("%I:%M %p")
        end_12 = time(end_h, end_m).strftime("%I:%M %p")
        return (
            False,
            f"Manager access hours ({start_12} – {end_12} IST) have ended. Current time: {now_ist.strftime('%I:%M %p IST')}."
        )

    def verify_manager_access_or_raise(
        self,
        user: User,
        current_dt: Optional[datetime] = None,
        db: Optional[Session] = None,
    ) -> None:
        """Raises HTTPException 403 if user is blocked or outside access window."""
        permitted, reason = self.is_within_operating_hours(user, current_dt, db=db)
        if not permitted:
            if user.is_locked:
                code = "ACCOUNT_LOCKED"
            elif not user.is_active:
                code = "ACCOUNT_DISABLED"
            else:
                code = "ACCESS_HOURS_EXPIRED"

            now_ist = current_dt or self.get_ist_now()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": code,
                    "message": reason,
                    "server_time_ist": format_ist_datetime(now_ist),
                    "role": user.role,
                }
            )

    @staticmethod
    def log_audit(
        db: Session,
        action: str,
        user_id: Optional[int] = None,
        user_email: Optional[str] = None,
        user_role: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        details: Optional[str] = None,
        business_id: Optional[int] = None,
    ) -> AuditLog:
        """Persists a security audit log entry scoped to business."""
        biz_id = business_id
        if biz_id is None and user_id:
            user_rec = db.query(User.business_id).filter(User.id == user_id).first()
            if user_rec and user_rec[0]:
                biz_id = user_rec[0]

        log_entry = AuditLog(
            business_id=biz_id or 1,
            user_id=user_id,
            user_email=user_email,
            user_role=user_role,
            action=action,
            ip_address=ip_address,
            user_agent=user_agent,
            details=details,
            timestamp_ist=format_ist_datetime(),
            created_at=datetime.utcnow()
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        return log_entry


access_control_service = AccessControlService()
