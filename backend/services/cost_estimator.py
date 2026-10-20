
# backend/services/cost_estimator.py

# DEMONSTRATION RATES ONLY — replace with verified local supplier prices.
# Quantities are rough planning assumptions, not engineering calculations.

TIER_MULTIPLIERS = {
    "Economy": 0.85,
    "Standard": 1.00,
    "Premium": 1.35,
}

MATERIALS = [
    {
        "name": "Cement",
        "unit": "bag",
        "quantity_per_sqft": 0.40,
        "rate": 400,
        "category": "Materials",
    },
    {
        "name": "Steel",
        "unit": "kg",
        "quantity_per_sqft": 4.00,
        "rate": 65,
        "category": "Materials",
    },
    {
        "name": "Bricks",
        "unit": "piece",
        "quantity_per_sqft": 8.00,
        "rate": 10,
        "category": "Materials",
    },
    {
        "name": "Sand",
        "unit": "cu ft",
        "quantity_per_sqft": 1.20,
        "rate": 55,
        "category": "Materials",
    },
    {
        "name": "Aggregate",
        "unit": "cu ft",
        "quantity_per_sqft": 0.80,
        "rate": 45,
        "category": "Materials",
    },
    {
        "name": "Labour",
        "unit": "sq ft",
        "quantity_per_sqft": 1.00,
        "rate": 300,
        "category": "Labour",
    },
    {
        "name": "Flooring and finishes",
        "unit": "sq ft",
        "quantity_per_sqft": 1.00,
        "rate": 150,
        "category": "Finishing",
    },
    {
        "name": "Electrical and plumbing",
        "unit": "sq ft",
        "quantity_per_sqft": 1.00,
        "rate": 120,
        "category": "Services",
    },
]


def estimate_construction_cost(built_up_area, tier):
    """Return a rough, illustrative construction-cost breakdown."""

    if tier not in TIER_MULTIPLIERS:
        raise ValueError("Invalid construction tier")

    multiplier = TIER_MULTIPLIERS[tier]
    breakdown = []
    total = 0

    for item in MATERIALS:
        quantity = built_up_area * item["quantity_per_sqft"]
        unit_rate = item["rate"] * multiplier
        amount = quantity * unit_rate

        breakdown.append({
            "name": item["name"],
            "category": item["category"],
            "quantity": round(quantity, 2),
            "unit": item["unit"],
            "unit_rate_inr": round(unit_rate, 2),
            "estimated_cost_inr": round(amount),
        })

        total += amount

    # A planning contingency, not a substitute for a professional estimate.
    contingency = total * 0.10
    grand_total = total + contingency

    return {
        "currency": "INR",
        "tier": tier,
        "estimated_subtotal_inr": round(total),
        "contingency_rate_percent": 10,
        "contingency_inr": round(contingency),
        "estimated_total_inr": round(grand_total),
        "breakdown": breakdown,
        "disclaimer": (
            "Illustrative prototype estimate only. Rates and quantities "
            "must be verified locally before making construction decisions."
        ),
    }

