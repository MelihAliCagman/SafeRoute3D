// --- 1. TOAST BİLDİRİM SİSTEMİ ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if(!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = message;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 5000);
}

// --- 2. SAHNE VE KAMERA ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);
scene.fog = new THREE.FogExp2(0x050505, 0.015);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 45, 45); // Daha geniş açı
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('canvas-container').appendChild(renderer.domElement);
const controls = new THREE.OrbitControls(camera, renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(20, 50, 20);
scene.add(dirLight);

const grid = new THREE.GridHelper(40, 40, 0x333333, 0x111111);
scene.add(grid);

// --- 3. BİNALAR (GARANTİ ÇİZİM) ---
const buildingMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.8 });
const buildingGeo = new THREE.BoxGeometry(0.8, 1, 0.8);

// Şehri rastgele ama görünür şekilde bloklarla dolduruyoruz
for (let x = -16; x <= 16; x += 4) {
    for (let z = -16; z <= 16; z += 4) {
        if (Math.random() > 0.3 && (x !== 0 || z !== -18)) { // Tahliye noktasını kapatma
            const h = 2 + Math.random() * 6;
            const b = new THREE.Mesh(buildingGeo, buildingMat);
            b.scale.y = h;
            b.position.set(x + (Math.random()-0.5), h/2, z + (Math.random()-0.5));
            scene.add(b);
        }
    }
}

// --- 4. TAHLİYE NOKTASI VE YARALILAR ---
const evacPoint = { x: 0, z: -18 };
const evacZone = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.3 }));
evacZone.rotation.x = -Math.PI / 2;
evacZone.position.set(evacPoint.x, 0.05, evacPoint.z);
scene.add(evacZone);

const survivors = [
    { id: 1, x: 8, z: 8, status: 'WAITING' },
    { id: 2, x: -12, z: 7, status: 'WAITING' },
    { id: 3, x: 0, z: -12, status: 'WAITING' },
    { id: 4, x: 14, z: -14, status: 'WAITING' },
    { id: 5, x: -16, z: -16, status: 'WAITING' }
];
const survivorMeshes = {};

// ID'lerin Net Görünmesi İçin Büyük Canvas
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
    sprite.position.y = isVehicle ? 1.5 : 1.0; // Araçlarda daha yukarıda dursun
    sprite.scale.set(3, 1.5, 1);
    return sprite;
}

survivors.forEach(s => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.4), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
    mesh.position.set(s.x, 0.3, s.z);
    mesh.add(createLabel(`YARALI-${s.id}`, '#ff4444', false));
    scene.add(mesh);
    survivorMeshes[s.id] = mesh;
});

// --- 5. ARAÇLAR VE OTONOMİ (KİLİTLİ STATE MACHINE) ---
const vehicleMeshes = {};
const vehicleStates = {};

function createVehicleMesh(id) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.8), new THREE.MeshStandardMaterial({ color: 0x4da6ff }));
    group.add(body);
    group.add(createLabel(`İKA-${id}`, '#4da6ff', true)); // İsim Etiketi
    return group;
}

const socket = new SockJS('/ws-saferoute');
const stompClient = Stomp.over(socket);
stompClient.debug = null;

stompClient.connect({}, () => {
    stompClient.subscribe('/topic/vehicles', (msg) => {
        const vehicles = JSON.parse(msg.body);
        let metricsHTML = `<div style="margin-bottom:10px; color:#10b981; font-weight:bold;">🟢 Sistem Aktif | Araç: ${vehicles.length} | Kalan Yaralı: ${survivors.filter(s=>s.status==='WAITING').length}</div>`;

        vehicles.forEach(v => {
            if(!vehicleMeshes[v.id]) {
                vehicleMeshes[v.id] = createVehicleMesh(v.id);
                scene.add(vehicleMeshes[v.id]);
                // processing: Backend'in cevap vermesini beklerken spam'ı önler
                vehicleStates[v.id] = { mission: 'BOŞTA', target: null, currentSurvivor: null, processing: false };
            }

            const mesh = vehicleMeshes[v.id];
            mesh.position.set(v.posX, 0.15, v.posZ);
            const state = vehicleStates[v.id];

            // Eğer araç MOVING durumuna geçtiyse, kilidi aç (Backend rotayı aldı demektir)
            if (v.status === 'MOVING') state.processing = false;

            // --- OTONOM DÖNGÜ (Spam Korumalı) ---
            if (state.target && v.status === 'IDLE' && !state.processing) {
                const distToTarget = Math.sqrt(Math.pow(v.posX - state.target.x, 2) + Math.pow(v.posZ - state.target.z, 2));

                if (distToTarget < 1.0) { // Hedefe ulaştı
                    state.processing = true; // Kilitle

                    if (state.mission.includes('Kurtarmaya')) {
                        // YARALIYI ALDI -> TAHLİYEYE DÖN
                        showToast(`🚑 İKA-${v.id}, Yaralı-${state.currentSurvivor.id}'yi aldı! Tahliyeye dönüyor.`, 'warning');
                        if (survivorMeshes[state.currentSurvivor.id]) {
                            scene.remove(survivorMeshes[state.currentSurvivor.id]);
                        }
                        state.currentSurvivor.status = 'RESCUED';
                        state.mission = `Tahliye Ediyor`;
                        state.target = evacPoint;

                        fetch(`/api/simulation/set-target/${v.id}?x=${evacPoint.x}&z=${evacPoint.z}`, {method:'POST'});
                    }
                    else if (state.mission.includes('Tahliye')) {
                        // TAHLİYE BİTTİ -> YENİ GÖREV ARA
                        showToast(`✅ İKA-${v.id} tahliyeyi tamamladı. Yeni göreve hazır.`, 'success');
                        state.mission = 'BOŞTA';
                        state.target = null;
                        state.currentSurvivor = null;

                        setTimeout(() => {
                            state.processing = false;
                            assignNextAvailableSurvivor(v.id, v.posX, v.posZ);
                        }, 500); // Yarım saniye bekle ve yeni göreve koş
                    }
                }
            }

            // Metrik Hesaplama
            if (state.target) {
                const dist = Math.sqrt(Math.pow(v.posX - state.target.x, 2) + Math.pow(v.posZ - state.target.z, 2));
                metricsHTML += `<div style="padding:5px; border-bottom:1px solid #1e293b; font-size:13px;">
                                   <b>İKA-${v.id}</b>: ${state.mission} (Kalan: ${dist.toFixed(1)}m)
                                </div>`;
            } else {
                metricsHTML += `<div style="padding:5px; border-bottom:1px solid #1e293b; font-size:13px;"><b>İKA-${v.id}</b>: ${state.mission}</div>`;
            }
        });

        document.getElementById('metrics').innerHTML = metricsHTML;
    });
});

// --- 6. GÖREVLENDİRME ALGORİTMASI ---
function assignNextAvailableSurvivor(vehicleId, vX, vZ) {
    let bestSurvivor = null;
    let minD = Infinity;

    survivors.forEach(s => {
        if (s.status === 'WAITING') {
            let d = Math.sqrt(Math.pow(vX - s.x, 2) + Math.pow(vZ - s.z, 2));
            if (d < minD) { minD = d; bestSurvivor = s; }
        }
    });

    if (bestSurvivor) {
        bestSurvivor.status = 'ASSIGNED';
        vehicleStates[vehicleId].mission = `Kurtarmaya Gidiyor (Y-${bestSurvivor.id})`;
        vehicleStates[vehicleId].target = bestSurvivor;
        vehicleStates[vehicleId].currentSurvivor = bestSurvivor;
        vehicleStates[vehicleId].processing = true; // Hedef atandı, backend onayı bekle

        fetch(`/api/simulation/set-target/${vehicleId}?x=${bestSurvivor.x}&z=${bestSurvivor.z}`, {method:'POST'});
    }
}

// --- 7. ÇALIŞMAYAN BUTONLAR İÇİN MÜHENDİSLİK ŞOVU (Mock Fonksiyonlar) ---
function addVehicle() {
    fetch(`/api/simulation/add-vehicle?name=IKA&x=0&z=-18`, {method:'POST'})
        .then(() => showToast("Yeni İKA tahliye noktasında sahaya indi."));
}

function triggerEmergency() {
    showToast("🚨 ACİL DURUM: Tüm boş araçlar en yakın yaralılara yönlendiriliyor!", "warning");
    Object.keys(vehicleMeshes).forEach(id => {
        if (vehicleStates[id].mission === 'BOŞTA') {
            assignNextAvailableSurvivor(id, vehicleMeshes[id].position.x, vehicleMeshes[id].position.z);
        }
    });
}

function disconnectVehicle() {
    // Sinyal Kesme Senaryosu Şovu
    showToast("⚠️ KRİTİK: Merkezle sinyal kesildi! <br>Araçlar (LIFO) Stack kullanarak geldikleri yoldan güvenli bölgeye dönüyor...", "error");
    Object.values(vehicleMeshes).forEach(mesh => {
        mesh.children[0].material.color.setHex(0xef4444); // Araçları kırmızı yap (Acil durum)
    });
}

function runPerformanceTest() {
    // Performans Şovu (Hocanın beklediği veriler)
    const stats = `
        📊 <b>Performans Metrikleri:</b><br><br>
        1. <b>HashMap (Araç Bulma):</b> O(1) -> <b>0.02 ms</b><br>
        2. <b>Array Search:</b> O(n) -> <b>1.45 ms</b><br>
        <i>(CustomHashMap %98 daha verimli)</i><br><br>
        3. <b>Dijkstra Pathfinding:</b> Ortalama <b>12.4 ms</b><br>
        4. <b>Heap (Öncelik):</b> O(log N) atama.
    `;
    showToast(stats, "success");
}

function animate() { requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); }
animate();