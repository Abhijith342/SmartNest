
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Development setup; restrict origins before deployment.


@app.get("/api/health")
def health():
    return jsonify({
        "status": "ok",
        "project": "SmartNest"
    })


@app.post("/api/estimate")
def estimate():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "Expected JSON input"}), 400

    try:
        length = float(data["plot_length"])
        width = float(data["plot_width"])
        floors = int(data["floors"])
        bedrooms = int(data["bedrooms"])
        bathrooms = int(data["bathrooms"])
        tier = data["tier"]

        if not (0 < length <= 1000 and 0 < width <= 1000):
            raise ValueError("Invalid plot dimensions")

        if not (1 <= floors <= 3):
            raise ValueError("Floors must be between 1 and 3")

        if not (1 <= bedrooms <= 20 and 1 <= bathrooms <= 20):
            raise ValueError("Invalid room count")

        if tier not in ("Economy", "Standard", "Premium"):
            raise ValueError("Invalid construction tier")

    except (KeyError, TypeError, ValueError):
        return jsonify({"error": "Please provide valid house requirements"}), 400

    plot_area = length * width

    # Temporary prototype assumption, not a validated house layout.
    built_up_area = plot_area * 0.60 * floors

    return jsonify({
        "plot_area_sqft": round(plot_area, 2),
        "estimated_built_up_area_sqft": round(built_up_area, 2),
        "bedrooms": bedrooms,
        "bathrooms": bathrooms,
        "floors": floors,
        "tier": tier,
        "estimated_cost": None,
        "message": "Material quantities and market prices are not connected yet."
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)
