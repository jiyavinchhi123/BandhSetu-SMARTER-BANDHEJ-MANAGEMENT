from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any, List


class BandhejCalculationService:
    """
    Centralized service for critical business operations and calculations
    for Indian Bandhej textile manufacturing and worker payments.
    """

    @staticmethod
    def calculate_worker_wage(
        piece_rate: float,
        quantity: int,
        deductions: float = 0.0,
        bonus: float = 0.0
    ) -> Dict[str, Any]:
        """
        Calculates net wage for a worker batch / consignment.
        All calculations rounded to 2 decimal places using Decimal for precision.
        """
        r_rate = Decimal(str(piece_rate))
        r_qty = Decimal(str(quantity))
        r_deductions = Decimal(str(deductions))
        r_bonus = Decimal(str(bonus))

        gross_amount = (r_rate * r_qty).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        net_payable = (gross_amount + r_bonus - r_deductions).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        return {
            "gross_amount": float(gross_amount),
            "bonus": float(r_bonus),
            "deductions": float(r_deductions),
            "net_payable": max(0.0, float(net_payable)),
        }

    @staticmethod
    def calculate_material_wastage(
        issued_weight_kg: float,
        returned_weight_kg: float,
        allowed_wastage_percent: float = 3.0
    ) -> Dict[str, Any]:
        """
        Calculates fabric/thread wastage and flags if it exceeds standard threshold.
        """
        issued = Decimal(str(issued_weight_kg))
        returned = Decimal(str(returned_weight_kg))
        allowed_pct = Decimal(str(allowed_wastage_percent))

        loss_kg = (issued - returned).quantize(Decimal("0.001"), rounding=ROUND_HALF_UP)
        actual_loss_pct = ((loss_kg / issued) * Decimal("100")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP) if issued > 0 else Decimal("0")

        exceeds_threshold = actual_loss_pct > allowed_pct

        return {
            "issued_kg": float(issued),
            "returned_kg": float(returned),
            "loss_kg": float(loss_kg),
            "actual_loss_pct": float(actual_loss_pct),
            "allowed_loss_pct": float(allowed_pct),
            "exceeds_threshold": bool(exceeds_threshold),
        }


calculation_service = BandhejCalculationService()

