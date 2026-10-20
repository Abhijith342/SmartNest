
const form = document.getElementById("houseForm");
const submitButton = document.getElementById("submitButton");
const result = document.getElementById("result");
const emptyState = document.getElementById("emptyState");
const statusMessage = document.getElementById("statusMessage");

function drawFloorPlan(data) {
    const canvas = document.getElementById("floorPlanCanvas");
    const ctx = canvas.getContext("2d");
    const status = document.getElementById("floorplanStatus");

    const length = Number(data.plot_length ?? document.getElementById("plot_length").value);
    const width = Number(data.plot_width ?? document.getElementById("plot_width").value);

    if (!(length > 0 && width > 0)) {
        status.textContent = "Enter valid plot dimensions to draw a plan.";
        return;
    }

    const rooms = [
        "Living room",
        "Kitchen",
        "Dining"
    ];

    for (let i = 1; i <= data.bedrooms; i++) {
        rooms.push(`Bedroom ${i}`);
    }

    for (let i = 1; i <= data.bathrooms; i++) {
        rooms.push(`Bathroom ${i}`);
    }

    // Reset the canvas before drawing a new plan.
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f8faf8";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const padding = 75;
    const availableWidth = canvas.width - padding * 2;
    const availableHeight = canvas.height - padding * 2;

    // Fit the plot proportions inside the canvas.
    const scale = Math.min(
        availableWidth / length,
        availableHeight / width
    );

    const plotWidth = length * scale;
    const plotHeight = width * scale;
    const startX = (canvas.width - plotWidth) / 2;
    const startY = (canvas.height - plotHeight) / 2;

    // Draw plot outline.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(startX, startY, plotWidth, plotHeight);
    ctx.strokeStyle = "#176b50";
    ctx.lineWidth = 4;
    ctx.strokeRect(startX, startY, plotWidth, plotHeight);

    // Arrange the rooms in a simple grid.
    const columns = Math.ceil(Math.sqrt(rooms.length * length / width));
    const rows = Math.ceil(rooms.length / columns);
    const cellWidth = plotWidth / columns;
    const cellHeight = plotHeight / rows;

    rooms.forEach((room, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        const x = startX + column * cellWidth;
        const y = startY + row * cellHeight;

        ctx.fillStyle = index % 2 === 0 ? "#e8f4ec" : "#edf3f7";
        ctx.fillRect(x, y, cellWidth, cellHeight);

        ctx.strokeStyle = "#6b8f7a";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, cellWidth, cellHeight);

        const roomLength = length / columns;
        const roomWidth = width / rows;

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#202b26";
        ctx.font = "bold 14px Arial";

        // Fit long room names into smaller boxes.
        const label = room;
        const maxTextWidth = Math.max(40, cellWidth - 12);
        let fontSize = 14;

        while (fontSize > 9) {
            ctx.font = `bold ${fontSize}px Arial`;
            if (ctx.measureText(label).width <= maxTextWidth) break;
            fontSize--;
        }

        ctx.fillText(
            label,
            x + cellWidth / 2,
            y + cellHeight / 2 - 7,
            maxTextWidth
        );

        ctx.font = "11px Arial";
        ctx.fillStyle = "#52645a";
        ctx.fillText(
            `${roomLength.toFixed(1)} × ${roomWidth.toFixed(1)} ft`,
            x + cellWidth / 2,
            y + cellHeight / 2 + 12,
            maxTextWidth
        );
    });

    // Add plot dimensions.
    ctx.fillStyle = "#176b50";
    ctx.font = "bold 15px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
        `${length} ft`,
        startX + plotWidth / 2,
        startY - 22
    );

    ctx.save();
    ctx.translate(startX - 28, startY + plotHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${width} ft`, 0, 0);
    ctx.restore();

    status.textContent =
        "Conceptual layout generated. Room dimensions are approximate " +
        "and do not account for walls, setbacks, circulation, or structural requirements.";
}

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

        const cost = data.cost_estimate;

        if (!cost) {
            throw new Error("Cost estimate is missing from the backend response.");
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

        const priceInfo = data.cost_estimate;

        document.getElementById("costMessage").textContent =
            `${priceInfo.tier} tier · ${priceInfo.location} · ` +
            `Rate data date: ${priceInfo.last_updated} · ` +
            `Status: ${priceInfo.price_status.replaceAll("_", " ")}.`;

        const formatINR = (amount) =>
            new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 0
            }).format(amount);

        document.getElementById("costSubtotal").textContent =
            formatINR(cost.estimated_subtotal_inr);

        document.getElementById("costContingency").textContent =
            formatINR(cost.contingency_inr);

        document.getElementById("costTotal").textContent =
            formatINR(cost.estimated_total_inr);

        document.getElementById("costDisclaimer").textContent =
            cost.disclaimer;

        const breakdownBody = document.getElementById("costBreakdown");
        breakdownBody.replaceChildren();

        cost.breakdown.forEach((item) => {
            const row = document.createElement("tr");

            const values = [
                item.name,
                `${item.quantity.toLocaleString("en-IN")} ${item.unit}`,
                formatINR(item.unit_rate_inr),
                formatINR(item.estimated_cost_inr)
            ];

            values.forEach((value) => {
                const cell = document.createElement("td");
                cell.textContent = value;
                row.appendChild(cell);
            });

            breakdownBody.appendChild(row);
        });


        emptyState.hidden = true;
        result.hidden = false;
        drawFloorPlan({
            ...data,
            plot_length: houseData.plot_length,
            plot_width: houseData.plot_width
        });

    } catch (error) {
        statusMessage.textContent =
            "Could not connect to SmartNest. Make sure your Flask backend is running. " +
            error.message;
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Calculate Estimate";
    }
});

document.getElementById("downloadPlanButton").addEventListener("click", () => {
    const canvas = document.getElementById("floorPlanCanvas");
    const link = document.createElement("a");

    link.download = "smartnest-floor-plan.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
});

