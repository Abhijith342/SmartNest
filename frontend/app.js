
const form = document.getElementById("houseForm");
const submitButton = document.getElementById("submitButton");
const result = document.getElementById("result");
const emptyState = document.getElementById("emptyState");
const statusMessage = document.getElementById("statusMessage");

// --------------------------------------------------
// 1. Generate room dimension and feature inputs
// --------------------------------------------------

function renderRoomInputs() {
    const container = document.getElementById("roomDimensions");
    if (!container) return;

    const bedrooms = Number(
        document.getElementById("bedrooms").value
    );
    const bathrooms = Number(
        document.getElementById("bathrooms").value
    );

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

    // Preserve previously entered dimensions and selections.
    const previousValues = {};

    container
        .querySelectorAll("[data-room][data-dimension]")
        .forEach((input) => {
            const key =
                `${input.dataset.room}-${input.dataset.dimension}`;
            previousValues[key] = input.value;
        });

    container
        .querySelectorAll("[data-feature-room][data-feature]")
        .forEach((input) => {
            const key =
                `${input.dataset.featureRoom}-${input.dataset.feature}`;
            previousValues[key] = input.value;
        });

    container.replaceChildren();

    const heading = document.createElement("div");
    heading.className = "room-dimension-heading";
    heading.innerHTML =
        "<span>Room</span><span>Length (ft)</span><span>Width (ft)</span>";

    container.appendChild(heading);

    roomList.forEach((room, index) => {
        // Room name and dimensions.
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

            input.setAttribute(
                "aria-label",
                `${room.name} ${dimension}`
            );

            const key = `${room.name}-${dimension}`;
            input.value = previousValues[key] ?? room[dimension];

            row.appendChild(input);
        });

        container.appendChild(row);

        // Door and window selections.
        const featureRow = document.createElement("div");
        featureRow.className = "room-feature-row";
        featureRow.style.display = "flex";
        featureRow.style.flexWrap = "wrap";
        featureRow.style.alignItems = "center";
        featureRow.style.gap = "12px";
        featureRow.style.padding = "4px 8px 12px";
        featureRow.style.borderBottom = "1px solid #e5e7eb";

        [
            { feature: "door", label: "Door" },
            { feature: "window", label: "Window" }
        ].forEach(({ feature, label: featureLabel }) => {
            const featureLabelElement =
                document.createElement("label");

            featureLabelElement.textContent = `${featureLabel}:`;
            featureLabelElement.style.display = "flex";
            featureLabelElement.style.alignItems = "center";
            featureLabelElement.style.gap = "6px";

            const select = document.createElement("select");

            select.dataset.featureRoom = room.name;
            select.dataset.feature = feature;

            select.setAttribute(
                "aria-label",
                `${room.name} ${featureLabel}`
            );

            [
                { value: "yes", text: "Yes" },
                { value: "no", text: "No" }
            ].forEach(({ value, text }) => {
                const option = document.createElement("option");
                option.value = value;
                option.textContent = text;
                select.appendChild(option);
            });

            const key = `${room.name}-${feature}`;
            select.value = previousValues[key] ?? "yes";

            featureLabelElement.appendChild(select);
            featureRow.appendChild(featureLabelElement);
        });

        container.appendChild(featureRow);
    });
}

// --------------------------------------------------
// 2. Collect room dimensions and feature selections
// --------------------------------------------------

function getRoomDimensions() {
    const inputs = document.querySelectorAll(
        "#roomDimensions [data-room][data-dimension]"
    );

    const rooms = new Map();

    inputs.forEach((input) => {
        const name = input.dataset.room;

        if (!rooms.has(name)) {
            rooms.set(name, {
                name,
                door: false,
                window: false
            });
        }

        rooms.get(name)[input.dataset.dimension] =
            Number(input.value);
    });

    const featureInputs = document.querySelectorAll(
        "#roomDimensions [data-feature-room][data-feature]"
    );

    featureInputs.forEach((input) => {
        const name = input.dataset.featureRoom;
        const feature = input.dataset.feature;

        if (!rooms.has(name)) return;

        // Dropdown values are lowercase: "yes" or "no".
        rooms.get(name)[feature] = input.value === "yes";
    });

    return Array.from(rooms.values());
}

// Generate initial room inputs.
renderRoomInputs();

document
    .getElementById("bedrooms")
    .addEventListener("change", renderRoomInputs);

document
    .getElementById("bathrooms")
    .addEventListener("change", renderRoomInputs);

// --------------------------------------------------
// 3. Draw the conceptual floor plan
// --------------------------------------------------

function drawFloorPlan(data) {
    const canvas = document.getElementById("floorPlanCanvas");
    const status = document.getElementById("floorplanStatus");

    if (!canvas || !status) {
        console.error("Floor plan canvas or status element is missing.");
        return;
    }

    const ctx = canvas.getContext("2d");

    const plotLength = Number(data.plot_length);
    const plotWidth = Number(data.plot_width);
    const rooms = data.rooms || [];

    if (
        !(plotLength > 0 && plotWidth > 0) ||
        rooms.length === 0
    ) {
        status.textContent =
            "Enter valid plot and room dimensions.";
        return;
    }

    if (
        rooms.some((room) =>
            !Number.isFinite(room.length) ||
            !Number.isFinite(room.width) ||
            room.length <= 0 ||
            room.width <= 0
        )
    ) {
        status.textContent =
            "All room dimensions must be positive numbers.";
        return;
    }

    // Arrange rooms in rows within the plot.
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

        if (
            room.length > plotLength ||
            room.width > plotWidth
        ) {
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

    if (y + rowHeight > plotWidth) {
        exceedsPlot = true;
    }

    // Prepare canvas.
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

    // Plot background and boundary.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(
        startX,
        startY,
        plotPixelWidth,
        plotPixelHeight
    );

    ctx.strokeStyle = "#176b50";
    ctx.lineWidth = 4;
    ctx.strokeRect(
        startX,
        startY,
        plotPixelWidth,
        plotPixelHeight
    );

    // Clip all room drawings to the plot.
    ctx.save();
    ctx.beginPath();
    ctx.rect(
        startX,
        startY,
        plotPixelWidth,
        plotPixelHeight
    );
    ctx.clip();

    placedRooms.forEach((room, index) => {
        const rx = startX + room.x * scale;
        const ry = startY + room.y * scale;
        const rw = room.length * scale;
        const rh = room.width * scale;

        // Room background.
        ctx.fillStyle =
            index % 2 === 0 ? "#e8f4ec" : "#edf3f7";

        ctx.fillRect(rx, ry, rw, rh);

        // Room walls.
        ctx.strokeStyle = "#6b8f7a";
        ctx.lineWidth = 2;
        ctx.strokeRect(rx, ry, rw, rh);

        // Door marker on the bottom wall.
        if (room.door === true && rw > 12 && rh > 12) {
            const doorWidth = Math.min(26, rw * 0.3);
            const doorX = rx + rw * 0.65;
            const doorY = ry + rh;

            // Erase part of the wall.
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(doorX, doorY);
            ctx.lineTo(doorX + doorWidth, doorY);
            ctx.stroke();

            // Draw door leaf.
            ctx.strokeStyle = "#8b5a2b";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(doorX, doorY);
            ctx.lineTo(doorX, doorY - doorWidth);
            ctx.stroke();

            // Draw opening arc.
            ctx.beginPath();
            ctx.arc(
                doorX,
                doorY,
                doorWidth,
                -Math.PI / 2,
                0,
                false
            );
            ctx.stroke();
        }

        // Window marker on the top wall.
        if (room.window === true && rw > 12 && rh > 12) {
            const windowWidth = Math.min(32, rw * 0.35);
            const windowX = rx + rw * 0.25;
            const windowY = ry;

            // Erase part of the wall.
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(windowX, windowY);
            ctx.lineTo(windowX + windowWidth, windowY);
            ctx.stroke();

            // Blue double-line window frame.
            ctx.strokeStyle = "#168aad";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(windowX, windowY - 1);
            ctx.lineTo(
                windowX + windowWidth,
                windowY - 1
            );

            ctx.moveTo(windowX, windowY + 4);
            ctx.lineTo(
                windowX + windowWidth,
                windowY + 4
            );
            ctx.stroke();

            // Window divider.
            ctx.beginPath();
            ctx.moveTo(
                windowX + windowWidth / 2,
                windowY - 3
            );
            ctx.lineTo(
                windowX + windowWidth / 2,
                windowY + 6
            );
            ctx.stroke();
        }

        // Room labels and dimensions.
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

    // Plot length label.
    ctx.fillStyle = "#176b50";
    ctx.font = "bold 15px Arial";
    ctx.textAlign = "center";

    ctx.fillText(
        `${plotLength} ft`,
        startX + plotPixelWidth / 2,
        startY - 22
    );

    // Plot width label.
    ctx.save();
    ctx.translate(
        startX - 28,
        startY + plotPixelHeight / 2
    );
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${plotWidth} ft`, 0, 0);
    ctx.restore();

    // Legend.
    const legendY = canvas.height - 22;

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = "12px Arial";

    ctx.strokeStyle = "#8b5a2b";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(25, legendY);
    ctx.lineTo(43, legendY);
    ctx.stroke();

    ctx.fillStyle = "#202b26";
    ctx.fillText("Door", 49, legendY);

    ctx.strokeStyle = "#168aad";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(110, legendY - 3);
    ctx.lineTo(130, legendY - 3);
    ctx.moveTo(110, legendY + 3);
    ctx.lineTo(130, legendY + 3);
    ctx.stroke();

    ctx.fillStyle = "#202b26";
    ctx.fillText("Window", 137, legendY);

    status.textContent = exceedsPlot
        ? "Warning: room dimensions exceed the available plot layout. Reduce room sizes or revise the plot dimensions. This is a rough packing check, not building-code validation."
        : "Door and window symbols are illustrative. This conceptual layout does not account for actual wall thickness, circulation, setbacks, or building regulations.";
}

// --------------------------------------------------
// 4. Submit form and display cost estimate
// --------------------------------------------------

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    statusMessage.textContent = "";
    result.hidden = true;
    submitButton.disabled = true;
    submitButton.textContent = "Calculating...";

    const houseData = {
        plot_length: Number(
            document.getElementById("plot_length").value
        ),
        plot_width: Number(
            document.getElementById("plot_width").value
        ),
        floors: Number(
            document.getElementById("floors").value
        ),
        bedrooms: Number(
            document.getElementById("bedrooms").value
        ),
        bathrooms: Number(
            document.getElementById("bathrooms").value
        ),
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
            throw new Error(
                "Cost estimate is missing from the backend response."
            );
        }

        // House information.
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

        // Cost information.
        document.getElementById("costMessage").textContent =
            `${cost.tier} tier · ${cost.location} · ` +
            `Rate data date: ${cost.last_updated} · ` +
            `Status: ${String(cost.price_status).replaceAll("_", " ")}.`;

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

        // Material cost breakdown.
        const breakdownBody =
            document.getElementById("costBreakdown");

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

        // Collect room settings once and draw the floor plan.
        const rooms = getRoomDimensions();

        console.table(rooms);

        emptyState.hidden = true;
        result.hidden = false;

        drawFloorPlan({
            plot_length: houseData.plot_length,
            plot_width: houseData.plot_width,
            rooms: rooms
        });

    } catch (error) {
        console.error("SmartNest error:", error);

        statusMessage.textContent =
            "Could not complete the estimate. Make sure your Flask " +
            "backend is running and check the error: " +
            error.message;
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Calculate Estimate";
    }
});

// --------------------------------------------------
// 5. Download floor plan as PNG
// --------------------------------------------------

document
    .getElementById("downloadPlanButton")
    .addEventListener("click", () => {
        const canvas =
            document.getElementById("floorPlanCanvas");

        const link = document.createElement("a");

        link.download = "smartnest-floor-plan.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
    });
