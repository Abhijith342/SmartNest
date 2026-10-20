
const form = document.getElementById("houseForm");
const submitButton = document.getElementById("submitButton");
const result = document.getElementById("result");
const emptyState = document.getElementById("emptyState");
const statusMessage = document.getElementById("statusMessage");


function renderRoomInputs() {
    const container = document.getElementById("roomDimensions");
    if (!container) return;

    const bedrooms = Number(document.getElementById("bedrooms").value);
    const bathrooms = Number(document.getElementById("bathrooms").value);

    const roomList = [
        { name: "Living room", length: 14, width: 12 },
        { name: "Kitchen", length: 10, width: 10 },
        { name: "Dining", length: 10, width: 8 }
    ];

    for (let i = 1; i <= bedrooms; i++) {
        roomList.push({
            name: `Bedroom ${i}`,
            length: 12,
            width: 10
        });
    }

    for (let i = 1; i <= bathrooms; i++) {
        roomList.push({
            name: `Bathroom ${i}`,
            length: 6,
            width: 5
        });
    }

    const previousValues = {};

    container.querySelectorAll("[data-room]").forEach((input) => {
        const key = `${input.dataset.room}-${input.dataset.dimension}`;
        previousValues[key] = input.value;
    });

    container.replaceChildren();

    const heading = document.createElement("div");
    heading.className = "room-dimension-heading";
    heading.innerHTML = "<span>Room</span><span>Length (ft)</span><span>Width (ft)</span>";
    container.appendChild(heading);

    roomList.forEach((room, index) => {
        const row = document.createElement("div");
        row.className = "room-dimension-row";

        const label = document.createElement("label");
        label.textContent = room.name;
        label.htmlFor = `room-${index}-length`;
        row.appendChild(label);

        ["length", "width"].forEach((dimension) => {
            const input = document.createElement("input");
            input.type = "number";
            input.min = "1";
            input.max = "100";
            input.step = "0.5";
            input.required = true;
            input.dataset.room = room.name;
            input.dataset.dimension = dimension;
            input.id = `room-${index}-${dimension}`;
            input.setAttribute("aria-label", `${room.name} ${dimension}`);

            const key = `${room.name}-${dimension}`;
            input.value = previousValues[key] ?? room[dimension];

            row.appendChild(input);
        });

        container.appendChild(row);
    });
}

renderRoomInputs();

document.getElementById("bedrooms").addEventListener("change", renderRoomInputs);
document.getElementById("bathrooms").addEventListener("change", renderRoomInputs);


function getRoomDimensions() {
    const inputs = document.querySelectorAll("#roomDimensions [data-room]");
    const rooms = new Map();

    inputs.forEach((input) => {
        const name = input.dataset.room;
        if (!rooms.has(name)) rooms.set(name, { name });

        rooms.get(name)[input.dataset.dimension] = Number(input.value);
    });

    return Array.from(rooms.values());
}

function drawFloorPlan(data) {
    const canvas = document.getElementById("floorPlanCanvas");
    const ctx = canvas.getContext("2d");
    const status = document.getElementById("floorplanStatus");

    const plotLength = Number(data.plot_length);
    const plotWidth = Number(data.plot_width);
    const rooms = data.rooms || [];

    if (!(plotLength > 0 && plotWidth > 0) || rooms.length === 0) {
        status.textContent = "Enter valid plot and room dimensions.";
        return;
    }

    if (rooms.some((room) =>
        !Number.isFinite(room.length) ||
        !Number.isFinite(room.width) ||
        room.length <= 0 ||
        room.width <= 0
    )) {
        status.textContent = "All room dimensions must be positive numbers.";
        return;
    }

    // Pack rooms into rows inside the plot.
    const placedRooms = [];
    let x = 0;
    let y = 0;
    let rowHeight = 0;
    let exceedsPlot = false;

    rooms.forEach((room) => {
        if (x > 0 && x + room.length > plotLength) {
            x = 0;
            y += rowHeight;
            rowHeight = 0;
        }

        if (room.length > plotLength || room.width > plotWidth) {
            exceedsPlot = true;
        }

        placedRooms.push({
            ...room,
            x,
            y
        });

        x += room.length;
        rowHeight = Math.max(rowHeight, room.width);
    });

    const totalLayoutHeight = y + rowHeight;

    if (totalLayoutHeight > plotWidth) {
        exceedsPlot = true;
    }

    // Prepare canvas and scale the plot to fit.
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f8faf8";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const padding = 75;
    const scale = Math.min(
        (canvas.width - padding * 2) / plotLength,
        (canvas.height - padding * 2) / plotWidth
    );

    const plotPixelWidth = plotLength * scale;
    const plotPixelHeight = plotWidth * scale;
    const startX = (canvas.width - plotPixelWidth) / 2;
    const startY = (canvas.height - plotPixelHeight) / 2;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(startX, startY, plotPixelWidth, plotPixelHeight);

    ctx.strokeStyle = "#176b50";
    ctx.lineWidth = 4;
    ctx.strokeRect(startX, startY, plotPixelWidth, plotPixelHeight);

    // Clip room drawings to the plot boundary.
    ctx.save();
    ctx.beginPath();
    ctx.rect(startX, startY, plotPixelWidth, plotPixelHeight);
    ctx.clip();

    placedRooms.forEach((room, index) => {
        const rx = startX + room.x * scale;
        const ry = startY + room.y * scale;
        const rw = room.length * scale;
        const rh = room.width * scale;

        ctx.fillStyle = index % 2 === 0 ? "#e8f4ec" : "#edf3f7";
        ctx.fillRect(rx, ry, rw, rh);

        ctx.strokeStyle = "#6b8f7a";
        ctx.lineWidth = 2;
        ctx.strokeRect(rx, ry, rw, rh);

        if (rw >= 45 && rh >= 35) {
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "#202b26";

            let fontSize = 13;
            ctx.font = `bold ${fontSize}px Arial`;

            while (
                fontSize > 8 &&
                ctx.measureText(room.name).width > rw - 8
            ) {
                fontSize--;
                ctx.font = `bold ${fontSize}px Arial`;
            }

            ctx.fillText(
                room.name,
                rx + rw / 2,
                ry + rh / 2 - 7,
                Math.max(10, rw - 8)
            );

            ctx.font = "10px Arial";
            ctx.fillStyle = "#52645a";
            ctx.fillText(
                `${room.length} × ${room.width} ft`,
                rx + rw / 2,
                ry + rh / 2 + 10,
                Math.max(10, rw - 8)
            );
        }
    });

    ctx.restore();

    // Plot dimension labels.
    ctx.fillStyle = "#176b50";
    ctx.font = "bold 15px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
        `${plotLength} ft`,
        startX + plotPixelWidth / 2,
        startY - 22
    );

    ctx.save();
    ctx.translate(startX - 28, startY + plotPixelHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${plotWidth} ft`, 0, 0);
    ctx.restore();

    status.textContent = exceedsPlot
        ? "Warning: the selected room dimensions exceed the available plot layout. Reduce room sizes or revise the plot dimensions. This is a rough packing check, not a building-code validation."
        : "Rooms are drawn to relative dimensions. This conceptual arrangement does not yet account for walls, gaps, circulation, setbacks, or building regulations.";
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

        console.log("Rooms sent to floor plan:", getRoomDimensions());
        
        drawFloorPlan({
            plot_length: houseData.plot_length,
            plot_width: houseData.plot_width,
            rooms: getRoomDimensions()
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

