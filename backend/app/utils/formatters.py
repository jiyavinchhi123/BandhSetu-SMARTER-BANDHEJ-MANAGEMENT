from datetime import datetime
import zoneinfo

IST = zoneinfo.ZoneInfo("Asia/Kolkata")


def get_current_ist_time() -> datetime:
    """Returns the current datetime in Indian Standard Time (IST)."""
    return datetime.now(IST)


def format_ist_datetime(dt: datetime = None) -> str:
    """Formats datetime in Indian standard readable format DD/MM/YYYY, hh:mm:ss A IST."""
    if dt is None:
        dt = get_current_ist_time()
    elif dt.tzinfo is None:
        dt = dt.replace(tzinfo=IST)
    else:
        dt = dt.astimezone(IST)
    return dt.strftime("%d/%m/%Y, %I:%M:%S %p IST")


def format_inr(amount: float) -> str:
    """
    Formats a numeric amount into Indian Currency notation (e.g. ₹ 1,50,000.00).
    """
    if amount is None:
        return "₹ 0.00"

    is_negative = amount < 0
    amount = abs(amount)
    parts = f"{amount:.2f}".split(".")
    integer_part = parts[0]
    decimal_part = parts[1]

    if len(integer_part) > 3:
        last_three = integer_part[-3:]
        remaining = integer_part[:-3]
        # In Indian numbering system, commas are placed every 2 digits before the hundreds
        chunks = []
        while len(remaining) > 2:
            chunks.insert(0, remaining[-2:])
            remaining = remaining[:-2]
        if remaining:
            chunks.insert(0, remaining)
        formatted_int = ",".join(chunks) + "," + last_three
    else:
        formatted_int = integer_part

    sign = "-" if is_negative else ""
    return f"{sign}₹ {formatted_int}.{decimal_part}"

