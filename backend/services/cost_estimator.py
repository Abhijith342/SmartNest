
import json
from pathlib import Path

DATA_FILE = (
    Path(__file__).resolve().parent.parent
    / "data"
    / "material_rates.json"
)


def load_price_data():
    with DATA_FILE.open("r", encoding="utf-8") as file:
        return json.load(file)


def estimate_construction_cost(built_up_area, tier):
    """Produce a simplified prototype estimate from editable rate data."""

    if not isinstance(built_up_area, (int, float)) or built_up_area <= 0:
        raise ValueError("Built-up area must be positive")

    price_data = load_price_data()
    tier_multipliers = price_data["tier_multipliers"]

    if tier not in tier_multipliers:
        raise ValueError("Invalid construction tier")

    multiplier = tier_multipliers[tier]
    breakdown = []
    subtotal = 0

    for item in price_data["materials"]:
        quantity = built_up_area * item["quantity_per_sqft"]
        unit_rate = item["rate"] * multiplier
        amount = quantity * unit_rate

        breakdown.append({
            "name": item["name"],
            "category": item["category"],
            "quantity": round(quantity, 2),
            "unit": item["unit"],
            "unit_rate_inr": round(unit_rate, 2),
            "estimated_cost_inr": round(amount)
        })

        subtotal += amount

    contingency_rate = price_data["contingency_rate_percent"]
    contingency = subtotal * contingency_rate / 100

    return {
        "currency": price_data["currency"],
        "location": price_data["location"],
        "price_status": price_data["price_status"],
        "last_updated": price_data["last_updated"],
        "tier": tier,
        "estimated_subtotal_inr": round(subtotal),
        "contingency_rate_percent": contingency_rate,
        "contingency_inr": round(contingency),
        "estimated_total_inr": round(subtotal + contingency),
        "breakdown": breakdown,
        "disclaimer": (
            "Illustrative prototype estimate only. Prices and quantities "
            "are not verified market data or an engineering bill of quantities. "
            "Obtain current local rates and professional estimates before building."
        )
    }
