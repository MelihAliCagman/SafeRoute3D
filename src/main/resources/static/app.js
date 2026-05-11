function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

function addAlgorithmStep(title, detail) {
    const list = document.getElementById('algorithm-log');
    if (!list) return;

    const item = document.createElement('li');
    item.innerHTML = `<b>${title}</b><span>${detail}</span>`;
    list.prepend(item);

    while (list.children.length > 8) {
        list.removeChild(list.lastChild);
    }
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x071018);
scene.fog = new THREE.FogExp2(0x071018, 0.013);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 45, 45);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('canvas-container').appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.95);
dirLight.position.set(18, 50, 24);
scene.add(dirLight);
const evacLight = new THREE.PointLight(0x10b981, 1.1, 20);
evacLight.position.set(0, 4, -18);
scene.add(evacLight);

const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(44, 44),
    new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.9 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.02;
scene.add(ground);

const grid = new THREE.GridHelper(40, 40, 0x334155, 0x172033);
scene.add(grid);

const roadMat = new THREE.MeshBasicMaterial({ color: 0x111827, transparent: true, opacity: 0.72 });
const roadLineMat = new THREE.MeshBasicMaterial({ color: 0x475569, transparent: true, opacity: 0.5 });
const roadTileGeo = new THREE.PlaneGeometry(1.04, 1.04);
const roadMarkGeo = new THREE.PlaneGeometry(0.28, 0.035);

fetch('/api/simulation/map/roads')
    .then(r => r.json())
    .then(roads => {
        roads.forEach(cell => {
            const tile = new THREE.Mesh(roadTileGeo, roadMat);
            tile.rotation.x = -Math.PI / 2;
            tile.position.set(cell.x, 0.012, cell.z);
            scene.add(tile);

            const mark = new THREE.Mesh(roadMarkGeo, roadLineMat);
            mark.rotation.x = -Math.PI / 2;
            mark.rotation.z = ((cell.x + cell.z) % 2 === 0) ? 0 : Math.PI / 2;
            mark.position.set(cell.x, 0.03, cell.z);
            scene.add(mark);
        });
        addAlgorithmStep('Yol agi', `${roads.length} duzensiz yol hucresi backend haritasindan cizildi.`);
    })
    .catch(() => addAlgorithmStep('Yol uyarisi', 'Yol agi verisi alinamadi.'));

const buildingPalette = [0x475569, 0x64748b, 0x334155, 0x52525b];
const buildingGeo = new THREE.BoxGeometry(0.72, 1, 0.72);

function createBuilding(x, z, h, color) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
        buildingGeo,
        new THREE.MeshStandardMaterial({ color, roughness: 0.74, metalness: 0.05 })
    );
    body.scale.y = h;
    body.position.y = h / 2;
    group.add(body);

    const roof = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.08, 0.8),
        new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8 })
    );
    roof.position.y = h + 0.04;
    group.add(roof);

    const windowMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.55 });
    for (let level = 0.7; level < h; level += 1.1) {
        const windowStrip = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.07, 0.02), windowMat);
        windowStrip.position.set(0, level, 0.371);
        group.add(windowStrip);
    }

    group.position.set(x, 0, z);
    return group;
}

function deterministicHeight(x, z) {
    return 1.3 + Math.abs((x * 29 + z * 17) % 5);
}

function deterministicColor(x, z) {
    return buildingPalette[Math.abs((x * 11 + z * 7) % buildingPalette.length)];
}

fetch('/api/simulation/map/obstacles')
    .then(r => r.json())
    .then(obstacles => {
        obstacles.forEach(cell => {
            const h = deterministicHeight(cell.x, cell.z);
            scene.add(createBuilding(cell.x, cell.z, h, deterministicColor(cell.x, cell.z)));
        });
        addAlgorithmStep('Harita senkronize', `${obstacles.length} engel hucresi bina/yikinti olarak cizildi.`);
    })
    .catch(() => addAlgorithmStep('Harita uyarisi', 'Engel listesi alinamadi; rota gorseli eksik olabilir.'));

const evacPoint = { x: 0, z: -18 };
const evacZone = new THREE.Mesh(
    new THREE.PlaneGeometry(4, 4),
    new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.32 })
);
evacZone.rotation.x = -Math.PI / 2;
evacZone.position.set(evacPoint.x, 0.05, evacPoint.z);
scene.add(evacZone);
const evacRing = new THREE.Mesh(
    new THREE.RingGeometry(2.05, 2.25, 48),
    new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.85 })
);
evacRing.rotation.x = -Math.PI / 2;
evacRing.position.set(evacPoint.x, 0.07, evacPoint.z);
scene.add(evacRing);

const survivorCandidatePoints = [
    { id: 1, x: 8, z: 8, status: 'WAITING' },
    { id: 2, x: -12, z: 7, status: 'WAITING' },
    { id: 3, x: 0, z: -12, status: 'WAITING' },
    { id: 4, x: 14, z: -14, status: 'WAITING' },
    { id: 5, x: -16, z: -16, status: 'WAITING' },
    { id: 6, x: -18, z: 17, status: 'WAITING' },
    { id: 7, x: -14, z: -9, status: 'WAITING' },
    { id: 8, x: -11, z: 2, status: 'WAITING' },
    { id: 9, x: -7, z: -12, status: 'WAITING' },
    { id: 10, x: -2, z: 13, status: 'WAITING' },
    { id: 11, x: 3, z: -5, status: 'WAITING' },
    { id: 12, x: 17, z: 17, status: 'WAITING' }
];

let survivorCount = 5;
let survivors = [];
const survivorMeshes = {};
const vehicleMeshes = {};
const vehicleStates = {};
const knownVehicles = new Map();
const performanceHistory = [];
let selectedVehicleId = null;
let simulationLocked = false;

function createLabel(text, color, isVehicle = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(text, 128, 64);

    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas) }));
    sprite.position.y = isVehicle ? 1.5 : 1.0;
    sprite.scale.set(3, 1.5, 1);
    return sprite;
}

function refreshSelectors() {
    const vehicleSelect = document.getElementById('vehicle-select');
    const survivorSelect = document.getElementById('survivor-select');
    if (!vehicleSelect || !survivorSelect) return;

    const currentVehicle = vehicleSelect.value;
    vehicleSelect.innerHTML = '';

    [...knownVehicles.values()]
        .sort((a, b) => a.id - b.id)
        .forEach(v => {
            const state = vehicleStates[v.id]?.mission || v.status;
            const option = document.createElement('option');
            option.value = v.id;
            option.textContent = `IKA-${v.id} (${state})`;
            vehicleSelect.appendChild(option);
        });

    if (currentVehicle && knownVehicles.has(Number(currentVehicle))) {
        vehicleSelect.value = currentVehicle;
    }

    selectedVehicleId = vehicleSelect.value ? Number(vehicleSelect.value) : null;

    const currentSurvivor = survivorSelect.value;
    survivorSelect.innerHTML = '';

    survivors
        .filter(s => s.status !== 'RESCUED')
        .forEach(s => {
            const option = document.createElement('option');
            option.value = s.id;
            option.textContent = `Yarali-${s.id} (${s.status})`;
            survivorSelect.appendChild(option);
        });

    if (currentSurvivor && survivorSelect.querySelector(`option[value="${currentSurvivor}"]`)) {
        survivorSelect.value = currentSurvivor;
    }
}

function updateSurvivorControls() {
    const countValue = document.getElementById('survivor-count-value');
    const decrease = document.getElementById('survivor-decrease');
    const increase = document.getElementById('survivor-increase');
    const note = document.getElementById('survivor-count-note');

    if (countValue) countValue.textContent = survivorCount;
    if (decrease) decrease.disabled = simulationLocked || survivorCount <= 1;
    if (increase) increase.disabled = simulationLocked || survivorCount >= survivorCandidatePoints.length;
    if (note) {
        note.textContent = simulationLocked
            ? 'Simulasyon basladigi icin yarali sayisi kilitlendi.'
            : `1-${survivorCandidatePoints.length} arasi yarali sayisi secilebilir.`;
    }
}

function renderSurvivors() {
    Object.values(survivorMeshes).forEach(mesh => scene.remove(mesh));
    Object.keys(survivorMeshes).forEach(key => delete survivorMeshes[key]);

    survivors.forEach(s => {
        const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.4),
            new THREE.MeshBasicMaterial({ color: 0xff0000 })
        );
        mesh.position.set(s.x, 0.3, s.z);
        mesh.add(createLabel(`YARALI-${s.id}`, '#ff4444', false));
        scene.add(mesh);
        survivorMeshes[s.id] = mesh;
    });

    refreshSelectors();
    updateSurvivorControls();
}

function resetSurvivors(count) {
    survivorCount = Math.min(Math.max(count, 1), survivorCandidatePoints.length);
    survivors = survivorCandidatePoints
        .slice(0, survivorCount)
        .map(s => ({ ...s, status: 'WAITING' }));
    renderSurvivors();
}

function changeSurvivorCount(delta) {
    if (simulationLocked) {
        showToast('Simulasyon basladiktan sonra yarali sayisi degistirilemez.', 'warning');
        return;
    }

    resetSurvivors(survivorCount + delta);
    addAlgorithmStep('Senaryo hazirligi', `Yarali sayisi ${survivorCount} olarak ayarlandi.`);
}

function lockSimulationSetup() {
    if (simulationLocked) return;
    simulationLocked = true;
    updateSurvivorControls();
    addAlgorithmStep('Senaryo kilitlendi', `${survivorCount} yarali ile simulasyon basladi.`);
}

function setSelectedVehicle(id) {
    selectedVehicleId = Number(id);
    Object.entries(vehicleMeshes).forEach(([vehicleId, mesh]) => {
        const selected = Number(vehicleId) === selectedVehicleId;
        mesh.children[0].material.color.setHex(selected ? 0xfacc15 : 0x38bdf8);
        const ring = mesh.children.find(child => child.name === 'selectionRing');
        if (ring) ring.material.opacity = selected ? 0.85 : 0;
    });
}

function markSurvivorAssigned(survivor) {
    const mesh = survivorMeshes[survivor.id];
    if (mesh) {
        mesh.material.color.setHex(0xf59e0b);
    }
}

function markSurvivorRescued(survivor) {
    const mesh = survivorMeshes[survivor.id];
    if (mesh) {
        scene.remove(mesh);
    }
    survivor.status = 'RESCUED';
}

function createVehicleMesh(id) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.68, 0.28, 0.92),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.34, metalness: 0.15 })
    );
    body.position.y = 0.16;
    group.add(body);

    const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(0.46, 0.22, 0.42),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.28, metalness: 0.08 })
    );
    cabin.position.set(0, 0.42, -0.04);
    group.add(cabin);

    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.7 });
    [[-0.4, 0.1, -0.28], [0.4, 0.1, -0.28], [-0.4, 0.1, 0.28], [0.4, 0.1, 0.28]].forEach(pos => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.1, 18), wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(pos[0], pos[1], pos[2]);
        group.add(wheel);
    });

    const selectedRing = new THREE.Mesh(
        new THREE.RingGeometry(0.58, 0.68, 32),
        new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0 })
    );
    selectedRing.name = 'selectionRing';
    selectedRing.rotation.x = -Math.PI / 2;
    selectedRing.position.y = 0.04;
    group.add(selectedRing);

    group.add(createLabel(`IKA-${id}`, '#7dd3fc', true));
    group.userData.vehicleId = id;
    return group;
}

function sendVehicleToTarget(vehicleId, target, missionText, survivor = null) {
    if (!vehicleId) {
        showToast('Once bir arac secmelisin.', 'warning');
        return;
    }

    const state = vehicleStates[vehicleId];
    if (!state) return;

    lockSimulationSetup();
    state.mission = missionText;
    state.target = target;
    state.currentSurvivor = survivor;
    state.processing = true;

    if (survivor) {
        survivor.status = 'ASSIGNED';
        markSurvivorAssigned(survivor);
    }

    addAlgorithmStep(
        'Dijkstra rota hesabi',
        `IKA-${vehicleId}: (${Math.round(vehicleMeshes[vehicleId].position.x)}, ${Math.round(vehicleMeshes[vehicleId].position.z)}) -> (${target.x}, ${target.z})`
    );

    fetch(`/api/simulation/set-target/${vehicleId}?x=${target.x}&z=${target.z}`, { method: 'POST' })
        .then(r => r.text())
        .then(text => {
            if (text.startsWith('Hata')) {
                state.processing = false;
                showToast(text, 'error');
                addAlgorithmStep('Rota reddedildi', text);
            } else {
                showToast(text, 'success');
                addAlgorithmStep('Queue olustu', text);
            }
        })
        .catch(() => {
            state.processing = false;
            showToast('Backend ile baglanti kurulamadı.', 'error');
        });
}

function returnVehicleToEvacuation(vehicleId) {
    const state = vehicleStates[vehicleId];
    if (!state) return;

    state.mission = 'Tahliyeye Donuyor';
    state.target = evacPoint;
    state.processing = true;
    state.currentSurvivor = null;

    addAlgorithmStep('Stack geri donus', `IKA-${vehicleId} tahliye noktasina yonlendirildi.`);

    fetch(`/api/simulation/return-to-evacuation/${vehicleId}`, { method: 'POST' })
        .then(r => r.text())
        .then(text => {
            showToast(`IKA-${vehicleId} tahliye noktasina donuyor.`, 'warning');
            addAlgorithmStep('Tahliye rotasi', text);
        })
        .catch(() => {
            state.processing = false;
            showToast('Tahliye komutu gonderilemedi.', 'error');
        });
}

resetSurvivors(survivorCount);

const socket = new SockJS('/ws-saferoute');
const stompClient = Stomp.over(socket);
stompClient.debug = null;

stompClient.connect({}, () => {
    addAlgorithmStep('WebSocket', 'Arac telemetrisi /topic/vehicles kanalindan dinleniyor.');

    stompClient.subscribe('/topic/vehicles', (msg) => {
        const vehicles = JSON.parse(msg.body);
        if (vehicles.length > 0) {
            lockSimulationSetup();
        }
        let metricsHTML = `<div class="metric-head">Sistem Aktif | Arac: ${vehicles.length} | Kalan Yarali: ${survivors.filter(s => s.status === 'WAITING').length}</div>`;

        vehicles.forEach(v => {
            knownVehicles.set(v.id, v);

            if (!vehicleMeshes[v.id]) {
                vehicleMeshes[v.id] = createVehicleMesh(v.id);
                scene.add(vehicleMeshes[v.id]);
                vehicleStates[v.id] = { mission: 'BOSTA', target: null, currentSurvivor: null, processing: false };

                if (!selectedVehicleId) {
                    selectedVehicleId = v.id;
                    const select = document.getElementById('vehicle-select');
                    if (select) select.value = String(v.id);
                }
            }

            const mesh = vehicleMeshes[v.id];
            mesh.position.set(v.posX, 0.15, v.posZ);
            const state = vehicleStates[v.id];

            if (v.status === 'MOVING') {
                state.processing = false;
            }

            if (state.target && v.status === 'IDLE' && !state.processing) {
                const distToTarget = Math.hypot(v.posX - state.target.x, v.posZ - state.target.z);

                if (distToTarget < 1.0) {
                    state.processing = true;

                    if (state.mission.includes('Kurtarmaya') && state.currentSurvivor) {
                        const rescued = state.currentSurvivor;
                        markSurvivorRescued(rescued);
                        showToast(`IKA-${v.id}, Yarali-${rescued.id} icin alimi tamamladi.`, 'warning');
                        addAlgorithmStep('Hedefe varis', `Yarali-${rescued.id} alindi; siradaki hedef tahliye noktasi.`);
                        returnVehicleToEvacuation(v.id);
                    } else if (state.mission.includes('Tahliye')) {
                        showToast(`IKA-${v.id} tahliye noktasina dondu.`, 'success');
                        addAlgorithmStep('Gorev tamamlandi', `IKA-${v.id} yeniden bosta.`);
                        state.mission = 'BOSTA';
                        state.target = null;
                        state.currentSurvivor = null;
                        state.processing = false;
                    }
                }
            }

            if (state.target) {
                const dist = Math.hypot(v.posX - state.target.x, v.posZ - state.target.z);
                metricsHTML += `<div class="metric-row"><b>IKA-${v.id}</b>: ${state.mission} <span>${dist.toFixed(1)}m</span></div>`;
            } else {
                metricsHTML += `<div class="metric-row"><b>IKA-${v.id}</b>: ${state.mission}</div>`;
            }
        });

        document.getElementById('metrics').innerHTML = metricsHTML;
        refreshSelectors();
        setSelectedVehicle(selectedVehicleId);
    });
});

function getSelectedSurvivor() {
    const survivorId = Number(document.getElementById('survivor-select').value);
    return survivors.find(s => s.id === survivorId);
}

function assignSelectedVehicle() {
    const survivor = getSelectedSurvivor();
    if (!survivor) {
        showToast('Secilebilir yarali kalmadi.', 'warning');
        return;
    }

    if (survivor.status === 'ASSIGNED') {
        showToast('Bu yarali zaten bir araca atanmis.', 'warning');
        return;
    }

    sendVehicleToTarget(
        selectedVehicleId,
        survivor,
        `Kurtarmaya Gidiyor (Y-${survivor.id})`,
        survivor
    );
}

function assignNextAvailableSurvivor(vehicleId, vX, vZ) {
    let bestSurvivor = null;
    let minD = Infinity;

    survivors.forEach(s => {
        if (s.status === 'WAITING') {
            const d = Math.hypot(vX - s.x, vZ - s.z);
            if (d < minD) {
                minD = d;
                bestSurvivor = s;
            }
        }
    });

    if (bestSurvivor) {
        addAlgorithmStep('Heap secimi', `En yakin bekleyen yarali: Y-${bestSurvivor.id}, mesafe ${minD.toFixed(1)}m.`);
        sendVehicleToTarget(vehicleId, bestSurvivor, `Kurtarmaya Gidiyor (Y-${bestSurvivor.id})`, bestSurvivor);
    }
}

function addVehicle() {
    lockSimulationSetup();
    fetch(`/api/simulation/add-vehicle?name=IKA&x=0&z=-18`, { method: 'POST' })
        .then(r => r.json())
        .then(v => {
            selectedVehicleId = v.id;
            showToast(`Yeni IKA-${v.id} tahliye noktasinda sahaya indi.`);
            addAlgorithmStep('HashMap kaydi', `IKA-${v.id} aktif arac tablosuna O(1) erisim icin eklendi.`);
        });
}

function triggerEmergency() {
    if (selectedVehicleId) {
        lockSimulationSetup();
        const mesh = vehicleMeshes[selectedVehicleId];
        showToast(`Secili IKA-${selectedVehicleId} en yakin yaraliya yonlendiriliyor.`, 'warning');
        assignNextAvailableSurvivor(selectedVehicleId, mesh.position.x, mesh.position.z);
        return;
    }

    showToast('Once arac ekle veya sec.', 'warning');
}

function disconnectVehicle() {
    if (!selectedVehicleId) {
        showToast('Tahliye icin once bir arac sec.', 'warning');
        return;
    }

    if (vehicleMeshes[selectedVehicleId]) {
        vehicleMeshes[selectedVehicleId].children[0].material.color.setHex(0xef4444);
    }

    showToast(`Sinyal kesildi: IKA-${selectedVehicleId} tahliye noktasina donuyor.`, 'error');
    returnVehicleToEvacuation(selectedVehicleId);
}

function parsePerformanceResult(text) {
    const match = text.match(/Arama Testi \((\d+).*?Dizi\(O\(n\)\): ([\d.,]+) ms \| HashMap\(O\(1\)\): ([\d.,]+) ms/);
    if (!match) return null;

    return {
        vehicleCount: Number(match[1]),
        arrayMs: Number(match[2].replace(',', '.')),
        hashMs: Number(match[3].replace(',', '.'))
    };
}

function renderPerformanceHistory() {
    const tbody = document.getElementById('performance-history');
    const empty = document.getElementById('performance-empty');
    if (!tbody || !empty) return;

    tbody.innerHTML = '';
    empty.style.display = performanceHistory.length ? 'none' : 'block';

    performanceHistory.forEach((entry, index) => {
        const diff = entry.arrayMs - entry.hashMs;
        const absDiff = Math.abs(diff);
        const hashIsFaster = diff > 0;
        const ratio = Math.max(entry.arrayMs, entry.hashMs) / Math.max(Math.min(entry.arrayMs, entry.hashMs), 0.0001);
        const gain = entry.arrayMs > 0 ? (diff / entry.arrayMs) * 100 : 0;
        const max = Math.max(entry.arrayMs, entry.hashMs, 0.0001);
        const arrayWidth = Math.max(4, (entry.arrayMs / max) * 100);
        const hashWidth = Math.max(4, (entry.hashMs / max) * 100);
        const badgeClass = hashIsFaster ? 'result-good' : 'result-noise';
        const resultText = hashIsFaster ? `HashMap ${ratio.toFixed(1)}x hizli` : `Dizi ${ratio.toFixed(1)}x hizli`;
        const note = hashIsFaster
            ? `HashMap ${absDiff.toFixed(4)} ms daha kisa surede buldu.`
            : `Veri sayisi az oldugu icin olcum gurultusu dizi lehine gorundu.`;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${performanceHistory.length - index}</td>
            <td>${entry.vehicleCount}</td>
            <td class="method-cell">
                <div class="method-row">
                    <span class="method-name">Dizi O(n)</span>
                    <div class="bar-track"><div class="bar-array" style="width:${arrayWidth}%"></div></div>
                    <span class="method-time">${entry.arrayMs.toFixed(4)} ms</span>
                </div>
                <div class="method-row">
                    <span class="method-name">HashMap O(1)</span>
                    <div class="bar-track"><div class="bar-hash" style="width:${hashWidth}%"></div></div>
                    <span class="method-time">${entry.hashMs.toFixed(4)} ms</span>
                </div>
            </td>
            <td><span class="result-badge ${badgeClass}">${resultText}</span></td>
            <td>${note}</td>
        `;
        tbody.appendChild(row);
    });

    const latest = performanceHistory[0];
    if (latest) {
        const diff = latest.arrayMs - latest.hashMs;
        const gain = latest.arrayMs > 0 ? (diff / latest.arrayMs) * 100 : 0;
        document.getElementById('perf-array-last').textContent = `${latest.arrayMs.toFixed(4)} ms`;
        document.getElementById('perf-hash-last').textContent = `${latest.hashMs.toFixed(4)} ms`;
        document.getElementById('perf-gain-last').textContent = gain > 0 ? `%${gain.toFixed(1)}` : 'olcum gurultusu';
    }
}

function openPerformanceModal() {
    const modal = document.getElementById('performance-modal');
    if (modal) {
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
    }
}

function closePerformanceModal() {
    const modal = document.getElementById('performance-modal');
    if (modal) {
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
    }
}

function runPerformanceTest() {
    openPerformanceModal();
    fetch('/api/simulation/performance-test')
        .then(r => r.text())
        .then(text => {
            const parsed = parsePerformanceResult(text);
            if (parsed) {
                performanceHistory.unshift(parsed);
                while (performanceHistory.length > 8) {
                    performanceHistory.pop();
                }
                renderPerformanceHistory();
                showToast('Performans karsilastirmasi acildi ve tabloya eklendi.', 'success');
            } else {
                showToast(text, 'warning');
            }
            addAlgorithmStep('Performans karsilastirma', text);
        });
}

document.getElementById('performance-modal').addEventListener('click', (event) => {
    if (event.target.id === 'performance-modal') {
        closePerformanceModal();
    }
});

document.getElementById('vehicle-select').addEventListener('change', (event) => {
    setSelectedVehicle(Number(event.target.value));
    addAlgorithmStep('Arac secimi', `Komutlar artik IKA-${selectedVehicleId} icin uygulanacak.`);
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

animate();
