from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.session import get_db
from app.models.company import Company
from app.models.user import User
from app.schemas.auth import (
    CompanyResponse,
    CompanyUpdateRequest,
    CompanySuspendRequest,
    CompanyReactivateRequest,
    CompanyDeleteRequest,
    UserResponse,
    AdminCreateRequest,
)
from app.api.deps import get_current_user, require_admin
from app.core.security import hash_password, verify_password
from app.services.access_control_service import access_control_service

router = APIRouter()


@router.get("/my-company", response_model=CompanyResponse, summary="Get current company details")
def get_my_company(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves metadata of the authenticated user's company."""
    comp = db.query(Company).filter(Company.id == (current_user.business_id or 1)).first()
    if not comp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found."
        )
    return comp


@router.put("/my-company", response_model=CompanyResponse, summary="Update company settings (Admin Only)")
def update_my_company(
    data: CompanyUpdateRequest,
    request: Request,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin updates company contact and business information."""
    comp = db.query(Company).filter(Company.id == (admin_user.business_id or 1)).first()
    if not comp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found."
        )

    if data.legal_name is not None:
        comp.legal_name = data.legal_name.strip()
    if data.address is not None:
        comp.address = data.address.strip()
    if data.city is not None:
        comp.city = data.city.strip()
    if data.state is not None:
        comp.state = data.state.strip()
    if data.phone is not None:
        comp.phone = data.phone.strip()
    if data.email is not None:
        comp.email = data.email.strip().lower()
    if data.gst_number is not None:
        comp.gst_number = data.gst_number.strip().upper()
    if data.operating_hours_start is not None:
        comp.operating_hours_start = data.operating_hours_start.strip()
    if data.operating_hours_end is not None:
        comp.operating_hours_end = data.operating_hours_end.strip()
    if data.operating_days is not None:
        comp.operating_days = data.operating_days.strip()
    if data.allow_manager_weekend_access is not None:
        comp.allow_manager_weekend_access = bool(data.allow_manager_weekend_access)

    comp.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(comp)

    client_ip = request.client.host if request.client else "unknown"
    access_control_service.log_audit(
        db=db,
        action="COMPANY_UPDATED",
        user_id=admin_user.id,
        user_email=admin_user.email,
        user_role="admin",
        ip_address=client_ip,
        details=f"Company '{comp.name}' settings updated by {admin_user.email}"
    )

    return comp


@router.post("/my-company/suspend", summary="Suspend company operations without deleting data (Primary Admin Only)")
def suspend_my_company(
    req: CompanySuspendRequest,
    request: Request,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Suspends all company operations while preserving 100% of historical data.
    Immediately blocks all users/managers from accessing the platform.
    Requires Primary Admin authorization and password verification.
    """
    if not admin_user.is_primary_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the Primary Admin / Business Owner can suspend the company."
        )

    # Password re-authentication
    if not verify_password(req.password, admin_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect administrator password."
        )

    comp = db.query(Company).filter(Company.id == (admin_user.business_id or 1)).first()
    if not comp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found.")

    comp.status = "Suspended"
    comp.suspension_reason = req.reason.strip()
    comp.suspended_at = datetime.utcnow()
    comp.suspended_by_id = admin_user.id
    comp.updated_at = datetime.utcnow()

    # Invalidate all active sessions for this company
    db.query(User).filter(User.business_id == comp.id).update(
        {User.token_version: User.token_version + 1}
    )
    db.commit()
    db.refresh(comp)

    client_ip = request.client.host if request.client else "unknown"
    access_control_service.log_audit(
        db=db,
        action="COMPANY_SUSPENDED",
        user_id=admin_user.id,
        user_email=admin_user.email,
        user_role="admin",
        ip_address=client_ip,
        details=f"Company '{comp.name}' ({comp.code}) suspended by Primary Admin {admin_user.email}. Reason: {req.reason}"
    )

    return {
        "message": f"Company '{comp.name}' has been suspended. All business data is safely preserved.",
        "status": comp.status,
        "suspended_at": comp.suspended_at.isoformat() if comp.suspended_at else None,
        "reason": comp.suspension_reason,
    }


@router.post("/my-company/reactivate", summary="Reactivate suspended company (Primary Admin Only)")
def reactivate_my_company(
    req: CompanyReactivateRequest,
    request: Request,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Reactivates a suspended company account.
    Requires Primary Admin password verification.
    """
    if not admin_user.is_primary_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the Primary Admin / Business Owner can reactivate the company."
        )

    if not verify_password(req.password, admin_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect administrator password."
        )

    comp = db.query(Company).filter(Company.id == (admin_user.business_id or 1)).first()
    if not comp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found.")

    comp.status = "Active"
    comp.suspension_reason = None
    comp.suspended_at = None
    comp.suspended_by_id = None
    comp.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(comp)

    client_ip = request.client.host if request.client else "unknown"
    access_control_service.log_audit(
        db=db,
        action="COMPANY_REACTIVATED",
        user_id=admin_user.id,
        user_email=admin_user.email,
        user_role="admin",
        ip_address=client_ip,
        details=f"Company '{comp.name}' ({comp.code}) reactivated by Primary Admin {admin_user.email}."
    )

    return {
        "message": f"Company '{comp.name}' is now active.",
        "status": comp.status,
    }


@router.post("/my-company/delete", summary="Company deletion with strong authorization and safety confirmation (Primary Admin Only)")
def delete_my_company(
    req: CompanyDeleteRequest,
    request: Request,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Deletes/Closes a company with strong safety verification:
    - Primary Admin authorization required.
    - Password re-verification required.
    - Exact confirmation phrase 'DELETE <code_or_name>' required.
    - Pre-condition check: Rejects if active consignments are pending with artisans.
    """
    if not admin_user.is_primary_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Strong Authorization Failed: Only the Primary Admin can authorize company deletion."
        )

    if not verify_password(req.password, admin_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect administrator password."
        )

    comp = db.query(Company).filter(Company.id == (admin_user.business_id or 1)).first()
    if not comp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found.")

    # Strong confirmation phrase verification
    expected_phrases = [
        f"DELETE {comp.code}".lower().strip(),
        f"DELETE {comp.name}".lower().strip(),
    ]
    if req.confirmation_phrase.lower().strip() not in expected_phrases:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Confirmation phrase mismatch. Please type exactly 'DELETE {comp.code}' or 'DELETE {comp.name}'."
        )

    # Pre-condition safety check: Prevent deletion if active pieces in custody exist
    from app.models.work_distribution import WorkDistribution
    active_consignments = db.query(WorkDistribution).filter(
        WorkDistribution.business_id == comp.id,
        WorkDistribution.quantity_pending > 0
    ).count()

    if active_consignments > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Cannot delete company: {active_consignments} consignment batches still have pieces pending in artisan custody. "
                "Please receive all pending pieces or suspend the company instead."
            )
        )

    # Soft-delete company and terminate all user access immediately
    comp.is_deleted = True
    comp.status = "Deleted"
    comp.deleted_at = datetime.utcnow()
    comp.deleted_by_id = admin_user.id
    comp.updated_at = datetime.utcnow()

    db.query(User).filter(User.business_id == comp.id).update(
        {User.token_version: User.token_version + 10, User.is_active: False}
    )
    db.commit()

    client_ip = request.client.host if request.client else "unknown"
    access_control_service.log_audit(
        db=db,
        action="COMPANY_DELETED",
        user_id=admin_user.id,
        user_email=admin_user.email,
        user_role="admin",
        ip_address=client_ip,
        details=f"Company '{comp.name}' ({comp.code}) deleted by Primary Admin {admin_user.email}."
    )

    return {
        "message": f"Company '{comp.name}' ({comp.code}) has been closed and deleted.",
        "status": "Deleted",
    }


@router.get("/admins", response_model=List[UserResponse], summary="List all Admins for this company (Admin Only)")
def list_company_admins(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Retrieves all Admin accounts belonging to the current company,
    indicating Primary Admin and who authorized each additional Admin.
    """
    biz_id = admin_user.business_id or 1
    admins = db.query(User).filter(
        User.business_id == biz_id,
        User.role == "admin"
    ).order_by(User.id.asc()).all()
    return admins


@router.post("/admins", response_model=UserResponse, status_code=status.HTTP_201_CREATED, summary="Authorize & Add New Admin (Admin Only)")
def create_company_admin(
    req: AdminCreateRequest,
    request: Request,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Primary Admin or authorized Admin invites/authorizes an additional Admin with
    equal operational permissions within this company.
    Maintains record of authorized_by_id.
    """
    clean_email = req.email.strip().lower()
    biz_id = admin_user.business_id or 1

    # Check if user with email already exists anywhere
    existing_user = db.query(User).filter(User.email.ilike(clean_email)).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An account with email '{clean_email}' already exists."
        )

    clean_phone = None
    if req.phone and req.phone.strip():
        raw_phone = req.phone.strip()
        digits = "".join(ch for ch in raw_phone if ch.isdigit())
        clean_phone = f"+91{digits}" if len(digits) == 10 else raw_phone

        existing_phone = db.query(User).filter(User.phone == clean_phone).first()
        if existing_phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"An account with mobile number '{clean_phone}' already exists."
            )

    new_admin = User(
        business_id=biz_id,
        is_primary_admin=False,
        authorized_by_id=admin_user.id,
        email=clean_email,
        phone=clean_phone,
        full_name=req.full_name.strip(),
        role="admin",
        hashed_password=hash_password(req.password.strip()),
        is_active=True,
        is_locked=False,
        access_start_time="00:00",
        access_end_time="23:59",
        token_version=1
    )
    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)

    client_ip = request.client.host if request.client else "unknown"
    access_control_service.log_audit(
        db=db,
        action="ADMIN_AUTHORIZED",
        user_id=admin_user.id,
        user_email=admin_user.email,
        user_role="admin",
        ip_address=client_ip,
        details=f"Admin {admin_user.email} authorized new Admin {new_admin.email} for business #{biz_id}"
    )

    return new_admin


@router.patch("/admins/{admin_id}/deactivate", response_model=UserResponse, summary="Deactivate Admin (Admin Only)")
def deactivate_company_admin(
    admin_id: int,
    request: Request,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Deactivates an authorized Admin account.
    Primary Admin cannot be deactivated to prevent locking out the company.
    """
    biz_id = admin_user.business_id or 1
    target = db.query(User).filter(
        User.id == admin_id,
        User.business_id == biz_id,
        User.role == "admin"
    ).first()

    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin account not found in your company."
        )

    if target.is_primary_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The Primary Admin / Business Owner cannot be deactivated."
        )

    if target.id == admin_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own administrative account."
        )

    target.is_active = False
    target.token_version += 1  # Invalidate any active session immediately
    db.commit()
    db.refresh(target)

    client_ip = request.client.host if request.client else "unknown"
    access_control_service.log_audit(
        db=db,
        action="ADMIN_DEACTIVATED",
        user_id=admin_user.id,
        user_email=admin_user.email,
        user_role="admin",
        ip_address=client_ip,
        details=f"Admin {target.email} deactivated by {admin_user.email}"
    )

    return target
