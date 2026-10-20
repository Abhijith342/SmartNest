
const form = document.getElementById("houseForm");
const submitButton = document.getElementById("submitButton");
const result = document.getElementById("result");
const emptyState = document.getElementById("emptyState");
const statusMessage = document.getElementById("statusMessage");

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    statusMessage.textContent = "";
    result.hidden = true;
    submitButton.disabled = true;
    submitButton.textContent = "Calculating...";

    const houseData = {
        plot_length: Number(document.getElementById("plot_length").value),
        plot_width: Number(document.getElementById("plot_width").value),
        floors: Number(document.getElementById("floors").value),
        bedrooms: Number(document.getElementById("bedrooms").value),
        bathrooms: Number(document.getElementById("bathrooms").value),
        tier: document.getElementById("tier").value
    };

    try {
        const response = await fetch(
            "http://127.0.0.1:5000/api/estimate",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(houseData)
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Unable to calculate the estimate."
            );
        }

        document.getElementById("plotArea").textContent =
            `${data.plot_area_sqft.toLocaleString()} sq ft`;

        document.getElementById("builtUpArea").textContent =
            `${data.estimated_built_up_area_sqft.toLocaleString()} sq ft`;

        document.getElementById("bedroomResult").textContent =
            data.bedrooms;

        document.getElementById("bathroomResult").textContent =
            data.bathrooms;

        document.getElementById("floorResult").textContent =
            data.floors;

        document.getElementById("tierResult").textContent =
            data.tier;

        document.getElementById("costMessage").textContent =
            data.message || "Cost data is not available yet.";

        emptyState.hidden = true;
        result.hidden = false;

    } catch (error) {
        statusMessage.textContent =
            "Could not connect to SmartNest. Make sure your Flask backend is running. " +
            error.message;
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Calculate Estimate";
    }
});
