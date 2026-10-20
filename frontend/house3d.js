
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/controls/OrbitControls.js";

// --------------------------------------------------
// 1. Set up the scene
// --------------------------------------------------

const container = document.getElementById("house3dContainer");
const status = document.getElementById("house3dStatus");

const cutawayButton = document.getElementById("viewCutaway");
const exteriorButton = document.getElementById("viewExterior");
const resetButton = document.getElementById("reset3DView");

const scene = new THREE.Scene();
scene.background = new THREE.Color("#edf4f7");

const camera = new THREE.PerspectiveCamera(
    45,
    1,
    0.1,
    2000
);

const renderer = new THREE.WebGLRenderer({
    antialias: true
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.maxPolarAngle = Math.PI * 0.49;

scene.add(new THREE.HemisphereLight("#ffffff", "#82918b", 2));

const sunlight = new THREE.DirectionalLight("#ffffff", 3);
sunlight.position.set(40, 65, 35);
sunlight.castShadow = true;
scene.add(sunlight);

// Ground.
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(2000, 2000),
    new THREE.MeshStandardMaterial({
        color: "#e6ece8",
        roughness: 1
    })
);

ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.16;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(200, 40, "#b5c6bc", "#d4ded8");
grid.position.y = -0.14;
scene.add(grid);

// Model references.
let modelGroup = null;
let roofMeshes = [];
let frontWallMeshes = [];
let currentView = "cutaway";
let currentHouseData = null;

// --------------------------------------------------
// 2. Materials and reusable box helper
// --------------------------------------------------

function makeMaterial(color, roughness = 0.85) {
    return new THREE.MeshStandardMaterial({
        color,
        roughness
    });
}

function addBox(
    parent,
    width,
    height,
    depth,
    x,
    y,
    z,
    material
) {
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(
            Math.max(width, 0.02),
            Math.max(height, 0.02),
            Math.max(depth, 0.02)
        ),
        material
    );

    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    parent.add(mesh);
    return mesh;
}

// --------------------------------------------------
// 3. Arrange rooms using the same row-packing approach
// --------------------------------------------------

function arrangeRooms(rooms, plotLength) {
    const placedRooms = [];

    let x = 0;
    let z = 0;
    let rowDepth = 0;

    rooms.forEach((room) => {
        const length = Number(room.length);
        const width = Number(room.width);

        if (
            !Number.isFinite(length) ||
            !Number.isFinite(width) ||
            length <= 0 ||
            width <= 0
        ) {
            return;
        }

        if (x > 0 && x + length > plotLength) {
            x = 0;
            z += rowDepth;
            rowDepth = 0;
        }

        placedRooms.push({
            ...room,
            length,
            width,
            x,
            z
        });

        x += length;
        rowDepth = Math.max(rowDepth, width);
    });

    const layoutLength = Math.max(
        1,
        ...placedRooms.map((room) => room.x + room.length)
    );

    const layoutDepth = Math.max(
        1,
        ...placedRooms.map((room) => room.z + room.width)
    );

    return {
        rooms: placedRooms,
        length: layoutLength,
        depth: layoutDepth
    };
}

// --------------------------------------------------
// 4. Build the 3D house
// --------------------------------------------------

function buildHouse(data) {
    if (modelGroup) {
        scene.remove(modelGroup);

        modelGroup.traverse((object) => {
            if (object.geometry) {
                object.geometry.dispose();
            }

            if (object.material) {
                const materials = Array.isArray(object.material)
                    ? object.material
                    : [object.material];

                materials.forEach((material) => material.dispose());
            }
        });
    }

    modelGroup = new THREE.Group();
    scene.add(modelGroup);

    roofMeshes = [];
    frontWallMeshes = [];

    const plotLength = Number(data.plot_length);
    const plotWidth = Number(data.plot_width);

    const floorCount = Math.max(
        1,
        Math.min(5, Math.floor(Number(data.floors) || 1))
    );

    const layout = arrangeRooms(
        data.rooms || [],
        plotLength
    );

    const rooms = layout.rooms;

    if (
        !(plotLength > 0) ||
        !(plotWidth > 0) ||
        rooms.length === 0
    ) {
        status.textContent =
            "Enter valid room and plot dimensions, then calculate again.";
        status.style.display = "flex";
        return false;
    }

    const length = layout.length;
    const depth = layout.depth;

    const floorHeight = 3;
    const wallHeight = 2.65;
    const wallThickness = 0.12;

    const floorMaterial = makeMaterial("#d7c6a5");
    const outerWallMaterial = makeMaterial("#f2eee5");
    const innerWallMaterial = makeMaterial("#fffaf0");
    const roofMaterial = makeMaterial("#596a63");
    const doorMaterial = makeMaterial("#805536");
    const glassMaterial = new THREE.MeshStandardMaterial({
        color: "#6dc7e8",
        roughness: 0.25,
        metalness: 0.1
    });

    const roomColors = [
        "#e6d7bb",
        "#d6e7d9",
        "#dce6f2",
        "#f0dfd7",
        "#e8e0f2",
        "#dcebe8"
    ];

    for (let floor = 0; floor < floorCount; floor++) {
        const baseY = floor * floorHeight;

        // Floor slab.
        addBox(
            modelGroup,
            length,
            0.18,
            depth,
            length / 2,
            baseY,
            depth / 2,
            floorMaterial
        );

        // Individual room floors.
        rooms.forEach((room, index) => {
            const roomFloorMaterial = makeMaterial(
                roomColors[index % roomColors.length]
            );

            addBox(
                modelGroup,
                room.length - 0.08,
                0.035,
                room.width - 0.08,
                room.x + room.length / 2,
                baseY + 0.11,
                room.z + room.width / 2,
                roomFloorMaterial
            );
        });

        const wallCenterY = baseY + 0.18 + wallHeight / 2;

        // Outer walls.
        const frontWall = addBox(
            modelGroup,
            length,
            wallHeight,
            wallThickness,
            length / 2,
            wallCenterY,
            0,
            outerWallMaterial
        );

        frontWallMeshes.push(frontWall);

        addBox(
            modelGroup,
            length,
            wallHeight,
            wallThickness,
            length / 2,
            wallCenterY,
            depth,
            outerWallMaterial
        );

        addBox(
            modelGroup,
            wallThickness,
            wallHeight,
            depth,
            0,
            wallCenterY,
            depth / 2,
            outerWallMaterial
        );

        addBox(
            modelGroup,
            wallThickness,
            wallHeight,
            depth,
            length,
            wallCenterY,
            depth / 2,
            outerWallMaterial
        );

        // Interior room partitions.
        rooms.forEach((room) => {
            const roomX = room.x;
            const roomZ = room.z;

            addBox(
                modelGroup,
                room.length,
                wallHeight,
                wallThickness,
                roomX + room.length / 2,
                wallCenterY,
                roomZ,
                innerWallMaterial
            );

            addBox(
                modelGroup,
                room.length,
                wallHeight,
                wallThickness,
                roomX + room.length / 2,
                wallCenterY,
                roomZ + room.width,
                innerWallMaterial
            );

            addBox(
                modelGroup,
                wallThickness,
                wallHeight,
                room.width,
                roomX,
                wallCenterY,
                roomZ + room.width / 2,
                innerWallMaterial
            );

            addBox(
                modelGroup,
                wallThickness,
                wallHeight,
                room.width,
                roomX + room.length,
                wallCenterY,
                roomZ + room.width / 2,
                innerWallMaterial
            );

            // Door marker on the front edge of the room.
            if (room.door === true) {
                const doorWidth = Math.min(0.9, room.length * 0.3);
                const doorHeight = Math.min(2.1, wallHeight - 0.1);

                addBox(
                    modelGroup,
                    doorWidth,
                    doorHeight,
                    0.045,
                    roomX + room.length * 0.65,
                    baseY + 0.18 + doorHeight / 2,
                    roomZ + 0.035,
                    doorMaterial
                );
            }

            // Window marker on the rear edge of the room.
            if (room.window === true) {
                const windowWidth = Math.min(1.4, room.length * 0.4);
                const windowHeight = 0.85;

                addBox(
                    modelGroup,
                    windowWidth,
                    windowHeight,
                    0.055,
                    roomX + room.length / 2,
                    baseY + 1.65,
                    roomZ + room.width - 0.035,
                    glassMaterial
                );
            }
        });
    }

    // Flat modern roof over the top floor.
    const roof = addBox(
        modelGroup,
        length + 0.5,
        0.24,
        depth + 0.5,
        length / 2,
        floorCount * floorHeight + 0.12,
        depth / 2,
        roofMaterial
    );

    roofMeshes.push(roof);

    // Small modern parapet around the roof.
    const parapetMaterial = makeMaterial("#c8d0cb");
    const parapetHeight = 0.45;
    const roofY = floorCount * floorHeight + 0.24;

    const parapets = [
        [length + 0.5, parapetHeight, 0.12, length / 2, roofY + parapetHeight / 2, -0.25],
        [length + 0.5, parapetHeight, 0.12, length / 2, roofY + parapetHeight / 2, depth + 0.25],
        [0.12, parapetHeight, depth + 0.5, -0.25, roofY + parapetHeight / 2, depth / 2],
        [0.12, parapetHeight, depth + 0.5, length + 0.25, roofY + parapetHeight / 2, depth / 2]
    ];

    parapets.forEach((values) => {
        const parapet = addBox(
            modelGroup,
            values[0],
            values[1],
            values[2],
            values[3],
            values[4],
            values[5],
            parapetMaterial
        );

        roofMeshes.push(parapet);
    });

    // Put the model on the ground and aim the camera.
    const maxDimension = Math.max(length, depth, floorCount * floorHeight);

    controls.target.set(length / 2, floorCount * floorHeight / 2, depth / 2);

    camera.position.set(
        length + maxDimension * 0.9,
        floorCount * floorHeight + maxDimension * 0.85,
        depth + maxDimension * 1.15
    );

    camera.near = 0.1;
    camera.far = Math.max(2000, maxDimension * 20);
    camera.updateProjectionMatrix();

    controls.minDistance = Math.max(2, maxDimension * 0.35);
    controls.maxDistance = maxDimension * 5;
    controls.update();

    status.style.display = "none";
    applyView();

    return true;
}

// --------------------------------------------------
// 5. Switch between cutaway and exterior
// --------------------------------------------------

function applyView() {
    const cutaway = currentView === "cutaway";

    roofMeshes.forEach((mesh) => {
        mesh.visible = !cutaway;
    });

    frontWallMeshes.forEach((mesh) => {
        mesh.visible = !cutaway;
    });

    cutawayButton.classList.toggle("active", cutaway);
    exteriorButton.classList.toggle("active", !cutaway);
}

cutawayButton.addEventListener("click", () => {
    currentView = "cutaway";
    applyView();
});

exteriorButton.addEventListener("click", () => {
    currentView = "exterior";
    applyView();
});

resetButton.addEventListener("click", () => {
    if (currentHouseData) {
        buildHouse(currentHouseData);
    }
});

// --------------------------------------------------
// 6. Receive the data from app.js
// --------------------------------------------------

window.addEventListener("smartnest:house-data", (event) => {
    currentHouseData = event.detail;
    buildHouse(currentHouseData);
});

// --------------------------------------------------
// 7. Responsive renderer and animation
// --------------------------------------------------

function resizeRenderer() {
    const width = container.clientWidth;
    const height = container.clientHeight;

    if (width <= 0 || height <= 0) return;

    renderer.setSize(width, height, false);

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
}

const resizeObserver = new ResizeObserver(resizeRenderer);
resizeObserver.observe(container);

window.addEventListener("resize", resizeRenderer);

resizeRenderer();

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

animate();
