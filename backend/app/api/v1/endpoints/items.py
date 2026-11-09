from typing import List, Optional, Annotated
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from app.database.session import get_db
from app.models.user import User
from app.models.item import Item
from app.schemas.item import ItemCreate, ItemUpdate, ItemResponse
from app.api.deps import get_current_user, require_admin, require_manager_or_admin

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
    Search item catalogue.
    Typing 'R' shows all matching items (e.g. 'Red Bandhani Saree', 'Royal Gajji Silk').
    Accessible to both Admin and Manager for work distribution forms.
    """
    query = db.query(Item)

    if active_only:
        query = query.filter(Item.is_active == True)

    if q and isinstance(q, str) and q.strip():
        term = f"%{q.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(Item.item_name).like(term),
                func.lower(Item.item_code).like(term),
                func.lower(Item.description).like(term),
            )
        )

    return query.order_by(Item.item_name.asc()).limit(limit).all()


@router.post("/", response_model=ItemResponse, status_code=status.HTTP_201_CREATED, summary="Create new catalogue item (Admin Only)")
def create_item(
    item_in: ItemCreate,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin creates a new item with designated piece rate."""
    if item_in.item_code:
        existing = db.query(Item).filter(Item.item_code == item_in.item_code.strip()).first()
        if existing:
            raise HTTPException(status_code=400, detail="Item code already in use.")

    item = Item(
        item_name=item_in.item_name.strip(),
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
    item = db.query(Item).filter(Item.id == item_id).first()
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
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found.")

    update_dict = data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        if value is not None:
            setattr(item, key, value.strip() if isinstance(value, str) else value)

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
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found.")

    item.is_active = not item.is_active
    db.commit()
    db.refresh(item)
    return item
