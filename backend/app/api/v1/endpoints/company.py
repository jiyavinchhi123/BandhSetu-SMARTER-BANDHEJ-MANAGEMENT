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
    UserResponse,
    AdminCreateRequest,
)
from app.api.deps import get_current_user, require_admin
from app.core.security import hash_password
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
