from typing import List, Optional, Annotated
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, String, cast
from app.database.session import get_db
from app.models.user import User
from app.models.item import Item
from app.schemas.item import ItemCreate, ItemUpdate, ItemResponse
from app.api.deps import require_admin, require_manager_or_admin

router = APIRouter()


@router.get("/", response_model=List[ItemResponse], summary="List and search item catalogue")
def list_items(
    q: Annotated[Optional[str], Query(description="Search term for item name or code (supports typing 'R')")] = None,
    active_only: Annotated[bool, Query(description="Filter for only active items")] = False,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
    current_user: User = Depends(require_manager_or_admin),
    db: Session = Depends(get_db)
):
    """
    Search item catalogue scoped to user's assigned company.
    Typing 'R' shows all matching items (e.g. 'Red Bandhani Saree', 'Royal Gajji Silk').
    Accessible to both Admin and Manager for work distribution forms.
    """
    biz_id = current_user.business_id or 1
    query = db.query(Item).filter(Item.business_id == biz_id)

    if active_only:
        query = query.filter(Item.is_active == True)

    if q and isinstance(q, str) and q.strip():
        raw_val = q.strip()
        num_clean = raw_val.lstrip("#").strip()
        term = f"%{raw_val.lower()}%"
        conditions = [
            func.lower(func.coalesce(Item.item_name, "")).like(term),
            func.lower(func.coalesce(Item.item_code, "")).like(term),
            func.lower(func.coalesce(Item.description, "")).like(term),
            cast(Item.id, String).like(f"%{num_clean}%"),
        ]
        if num_clean.isdigit():
            conditions.append(Item.id == int(num_clean))
        query = query.filter(or_(*conditions))

    return query.order_by(Item.id.asc()).limit(limit).all()


@router.post("/", response_model=ItemResponse, status_code=status.HTTP_201_CREATED, summary="Create new catalogue item (Admin Only)")
def create_item(
    item_in: ItemCreate,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin creates a new item with designated piece rate for their company."""
    biz_id = admin_user.business_id or 1
    if item_in.item_code:
        existing = db.query(Item).filter(
            Item.item_code == item_in.item_code.strip(),
            Item.business_id == biz_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Item code already in use in this company.")

    item = Item(
        business_id=biz_id,
        item_name=item_in.item_name.strip(),
        item_type=item_in.item_type.strip() if item_in.item_type else None,
        is_sarkam=bool(item_in.is_sarkam),
        is_choot=bool(item_in.is_choot),
        item_code=item_in.item_code.strip() if item_in.item_code else None,
        price_per_piece=item_in.price_per_piece,
        description=item_in.description,
        is_active=item_in.is_active
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/{item_id}", response_model=ItemResponse, summary="Get item details")
def get_item(
    item_id: int,
    current_user: User = Depends(require_manager_or_admin),
    db: Session = Depends(get_db)
):
    """Returns item details including active price."""
    biz_id = current_user.business_id or 1
    item = db.query(Item).filter(Item.id == item_id, Item.business_id == biz_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found.")
    return item


@router.put("/{item_id}", response_model=ItemResponse, summary="Update item details or price (Admin Only)")
def update_item(
    item_id: int,
    data: ItemUpdate,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Admin updates item name or modifies price per piece.
    NOTE: Updating price here does NOT affect existing work distributions,
    which permanently retain their historical snapshot rate!
    """
    biz_id = admin_user.business_id or 1
    item = db.query(Item).filter(Item.id == item_id, Item.business_id == biz_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found.")

    # Concurrency control: Optimistic locking version check
    if data.expected_version is not None and (item.version or 1) != data.expected_version:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Conflict: This catalogue item was modified by another user concurrently. Please refresh to load the latest data."
        )

    update_dict = data.model_dump(exclude_unset=True, exclude={"expected_version"})
    for key, value in update_dict.items():
        if value is not None:
            setattr(item, key, value.strip() if isinstance(value, str) else value)

    item.version = (item.version or 1) + 1
    db.commit()
    db.refresh(item)
    return item


@router.patch("/{item_id}/toggle-status", response_model=ItemResponse, summary="Activate or deactivate item (Admin Only)")
def toggle_item_status(
    item_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin activates or deactivates an item catalogue entry."""
    biz_id = admin_user.business_id or 1
    item = db.query(Item).filter(Item.id == item_id, Item.business_id == biz_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found.")

    item.is_active = not item.is_active
    db.commit()
    db.refresh(item)
    return item
