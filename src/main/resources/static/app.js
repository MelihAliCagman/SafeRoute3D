// --- SAHNE KURULUMU ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(40, 50, 40);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('canvas-container').appendChild(renderer.domElement);
const controls = new THREE.OrbitControls(camera, renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.7));

// --- GENİŞ ŞEHİR PLANI (40x40) ---
const grid = new THREE.GridHelper(40, 40, 0x333333, 0x111111);
scene.add(grid);

// CityTour Stilinde Bina Blokları
const buildingMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
for (let x = -15; x <= 15; x += 5) {
    for (let z = -15; z <= 15; z += 5) {
        // 3x3'lük bloklar (Dijkstra engelleriyle aynı)
        const h = 2 + Math.random() * 10;
        const b = new THREE.Mesh(new THREE.BoxGeometry(2.8, h, 2.8), buildingMat);
        b.position.set(x + 1, h/2, z + 1);
        scene.add(b);
    }
}

// 5 YARALI HEDEFİ
const survivors = [];
const coords = [[8,8], [-12,7], [0,-12], [14,-14], [-16,-16]];
coords.forEach((c, i) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.4), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
    s.position.set(c[0], 0.3, c[1]);
    s.userData = { isSurvivor: true, x: c[0], z: c[1], id: i+1 };
    scene.add(s);
    survivors.push(s);
    const l = new THREE.PointLight(0xff0000, 2, 5); l.position.set(c[0], 1, c[1]); scene.add(l);
});

// --- ARAÇLAR VE ETİKETLER ---
const vehicleMeshes = {};
function createVehicleMesh(id) {
    const group = new THREE.Group();
    // Daha küçük araç (0.4 ölçek)
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.8), new THREE.MeshStandardMaterial({ color: 0x4da6ff }));
    group.add(body);

    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.fillRect(0,0,128,64);
    ctx.fillStyle = '#4da6ff'; ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center'; ctx.fillText("İKA-" + id, 64, 40);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas) }));
    sprite.position.y = 1; sprite.scale.set(2, 1, 1);
    group.add(sprite);
    return group;
}

// --- KARAR DESTEK VE TIKLAMA ---
const raycaster = new THREE.Raycaster();
window.addEventListener('dblclick', (e) => {
    const mouse = new THREE.Vector2((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(survivors);

    if (intersects.length > 0) {
        const s = intersects[0].object.userData;
        fetch(`/api/simulation/closest-vehicle?x=${s.x}&z=${s.z}`)
            .then(res => res.json()).then(id => {
            if(!id) return showToast("Araç yok!", "error");
            showToast(`Yaralıya en yakın İKA-${id} atanıyor...`);
            fetch(`/api/simulation/set-target/${id}?x=${s.x}&z=${s.z}`, {method:'POST'})
                .then(r => r.text()).then(t => showToast(t));
        });
    }
});

// --- WEBSOCKET ---
const socket = new SockJS('/ws-saferoute');
const stompClient = Stomp.over(socket);
stompClient.debug = null;
stompClient.connect({}, () => {
    stompClient.subscribe('/topic/vehicles', (msg) => {
        const vehicles = JSON.parse(msg.body);
        vehicles.forEach(v => {
            if(!vehicleMeshes[v.id]) {
                vehicleMeshes[v.id] = createVehicleMesh(v.id);
                scene.add(vehicleMeshes[v.id]);
            }
            vehicleMeshes[v.id].position.set(v.posX, 0.1, v.posZ);
            // MOVING ise tepe lambasını yeşil yap
            const chassis = vehicleMeshes[v.id].children[0];
            chassis.material.color.setHex(v.status === 'MOVING' ? 0x00ff00 : 0x4da6ff);
        });
    });
});

function addVehicle() {
    const rx = Math.floor(Math.random()*10 - 5);
    const rz = Math.floor(Math.random()*10 - 5);
    fetch(`/api/simulation/add-vehicle?name=IKA&x=${rx}&z=${rz}`, {method:'POST'})
        .then(() => showToast("Yeni İKA indirildi."));
}

function animate() { requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); }
animate();