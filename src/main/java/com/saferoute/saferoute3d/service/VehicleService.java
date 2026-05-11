package com.saferoute.saferoute3d.service;

import com.saferoute.saferoute3d.algorithm.Node;
import com.saferoute.saferoute3d.datastructures.*;
import com.saferoute.saferoute3d.entity.Vehicle;
import com.saferoute.saferoute3d.repository.VehicleRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class VehicleService {

    private final VehicleRepository vehicleRepository;
    private final SimpMessagingTemplate messagingTemplate;

    private CustomGraph mapGraph;
    private CustomHashMap<Long, Vehicle> activeVehiclesMap;
    private CustomHashMap<Long, CustomQueue<Node>> vehicleActiveRoutes;
    private CustomHashMap<Long, CustomStack<Node>> vehicleReturnRoutes;
    private static final int EVAC_X = 0;
    private static final int EVAC_Z = -18;

    @PostConstruct
    public void init() {
        // 1. Sistem temizliği (0 araçla başla)
        vehicleRepository.deleteAll();

        mapGraph = new CustomGraph();
        activeVehiclesMap = new CustomHashMap<>();
        vehicleActiveRoutes = new CustomHashMap<>();
        vehicleReturnRoutes = new CustomHashMap<>();

        // 2. Geniş Harita Oluştur (40x40)
        for (int x = -20; x <= 20; x++) {
            for (int z = -20; z <= 20; z++) {
                mapGraph.addNode(new Node(x, z));
            }
        }

        // 3. Deprem Senaryosu: Düzensiz Yıkıntılar
        int[] clustersX = {-12, -8, -5, 2, 6, 10, 14, -15, 0, 8, -3};
        int[] clustersZ = {-10, 5, -14, 8, -6, 12, 0, 15, -2, -15, 10};

        for (int i = 0; i < clustersX.length; i++) {
            int cx = clustersX[i];
            int cz = clustersZ[i];
            for(int dx = -2; dx <= 2; dx++) {
                for(int dz = -2; dz <= 2; dz++) {
                    if(Math.random() > 0.3) { // Rastgele yıkıntı yerleşimi
                        Node n = mapGraph.getNodeById((cx+dx) + "," + (cz+dz));
                        if (n != null) n.setObstacle(true);
                    }
                }
            }
        }

        // Tahliye Noktasını (Hastane Girişi) açık tut
        for (Node node : mapGraph.getNodes()) {
            node.setObstacle(!isRoadCell(node.getX(), node.getY()));
        }

        int[][] safePoints = {
                {EVAC_X, EVAC_Z},
                {8, 8},
                {-12, 7},
                {0, -12},
                {14, -14},
                {-16, -16}
        };

        for (int[] point : safePoints) {
            Node safeNode = mapGraph.getNodeById(point[0] + "," + point[1]);
            if (safeNode != null) safeNode.setObstacle(false);
        }

        // Yolları birbirine bağla
        for (Node node : mapGraph.getNodes()) {
            connectNeighbors(node);
        }

        System.out.println("SafeRoute3D: 40x40 Düzensiz Şehir Haritası Hazır!");
    }

    private void connectNeighbors(Node node) {
        if (node.isObstacle()) return;
        int x = node.getX();
        int z = node.getY();
        int[][] neighbors = {{x+1, z}, {x-1, z}, {x, z+1}, {x, z-1}};
        for (int[] n : neighbors) {
            Node neighbor = mapGraph.getNodeById(n[0] + "," + n[1]);
            if (neighbor != null && !neighbor.isObstacle()) {
                mapGraph.addEdge(node, neighbor, 1.0);
            }
        }
    }

    // --- TEMEL ARAÇ İŞLEMLERİ ---

    private boolean isRoadCell(int x, int z) {
        if ((x == EVAC_X && z == EVAC_Z)
                || (x == 8 && z == 8)
                || (x == -12 && z == 7)
                || (x == 0 && z == -12)
                || (x == 14 && z == -14)
                || (x == -16 && z == -16)) {
            return true;
        }

        boolean avenue = x == -18 || x == -14 || x == -11 || x == -7 || x == -2 || x == 3 || x == 7 || x == 12 || x == 17;
        boolean street = z == -18 || z == -14 || z == -9 || z == -5 || z == -1 || z == 4 || z == 8 || z == 13 || z == 17;

        boolean connector =
                (z == -10 && x >= -15 && x <= -3)
                        || (z == 4 && x >= -3 && x <= 14)
                        || (z == 15 && x >= -16 && x <= -6)
                        || (z == -14 && x >= 7 && x <= 17)
                        || (z == 12 && x >= -18 && x <= -11)
                        || (x == 0 && z >= -18 && z <= -12)
                        || (x == -16 && z >= -16 && z <= 7)
                        || (x == 8 && z >= 4 && z <= 8)
                        || (x == 14 && z >= -14 && z <= 4)
                        || (z == -12 && x >= -14 && x <= -7)
                        || (z == 2 && x >= -11 && x <= 3)
                        || (z == 10 && x >= 7 && x <= 17)
                        || (x == -5 && z >= -9 && z <= 4)
                        || (x == 10 && z >= -14 && z <= 13);

        return avenue || street || connector;
    }

    private boolean hasNearbyObstacle(int x, int z) {
        for (int dx = -1; dx <= 1; dx++) {
            for (int dz = -1; dz <= 1; dz++) {
                if (dx == 0 && dz == 0) continue;
                Node neighbor = mapGraph.getNodeById((x + dx) + "," + (z + dz));
                if (neighbor != null && neighbor.isObstacle()) {
                    return true;
                }
            }
        }
        return false;
    }

    public Vehicle addVehicle(String name, double x, double z) {
        Vehicle v = new Vehicle();
        v.setName(name);
        // Tüm yeni araçlar Tahliye Noktasından (Yeşil Bölge) başlar
        v.setPosX(0.0);
        v.setPosZ(-18.0);
        v.setPosY(0.0);
        v.setBatteryLevel(100.0);
        v.setStatus(Vehicle.VehicleStatus.IDLE);

        Vehicle saved = vehicleRepository.save(v);
        activeVehiclesMap.put(saved.getId(), saved);
        vehicleReturnRoutes.put(saved.getId(), new CustomStack<>());
        return saved;
    }

    public List<Vehicle> getAllVehicles() {
        return vehicleRepository.findAll();
    }

    public Vehicle getVehicleFast(Long id) {
        return activeVehiclesMap.get(id);
    }

    public List<Map<String, Integer>> getObstacleCells() {
        List<Map<String, Integer>> obstacles = new ArrayList<>();
        for (Node node : mapGraph.getNodes()) {
            if (node.isObstacle() && shouldRenderBuilding(node.getX(), node.getY())) {
                obstacles.add(Map.of("x", node.getX(), "z", node.getY()));
            }
        }
        return obstacles;
    }

    private boolean shouldRenderBuilding(int x, int z) {
        int value = Math.abs((x * 37) + (z * 19) + (x * z * 3));
        return value % 5 == 0 || value % 11 == 0;
    }

    public List<Map<String, Integer>> getRoadCells() {
        List<Map<String, Integer>> roads = new ArrayList<>();
        for (Node node : mapGraph.getNodes()) {
            if (isRoadCell(node.getX(), node.getY())) {
                roads.add(Map.of("x", node.getX(), "z", node.getY()));
            }
        }
        return roads;
    }

    // --- OTONOM ROTA VE KARAR DESTEK ---

    public Long findClosestVehicleId(int targetX, int targetZ) {
        List<Vehicle> all = vehicleRepository.findAll();
        Long closestId = null;
        double minDistance = Double.MAX_VALUE;

        for (Vehicle v : all) {
            if (v.getStatus() == Vehicle.VehicleStatus.IDLE) {
                double dist = Math.sqrt(Math.pow(v.getPosX() - targetX, 2) + Math.pow(v.getPosZ() - targetZ, 2));
                if (dist < minDistance) {
                    minDistance = dist;
                    closestId = v.getId();
                }
            }
        }
        return closestId;
    }

    public String setVehicleTarget(Long vehicleId, int targetX, int targetZ) {
        Vehicle vehicle = vehicleRepository.findById(vehicleId).orElse(null);
        if (vehicle == null) return "Hata: Araç ID bulunamadı.";

        Node source = mapGraph.getNodeById((int)Math.round(vehicle.getPosX()) + "," + (int)Math.round(vehicle.getPosZ()));
        Node target = mapGraph.getNodeById(targetX + "," + targetZ);

        if (source == null || target == null) return "Hata: Geçersiz koordinatlar.";
        if (target.isObstacle()) return "Hata: Hedef yıkıntı içinde!";
        if (source.getId().equals(target.getId())) {
            vehicleActiveRoutes.put(vehicleId, new CustomQueue<>());
            vehicle.setStatus(Vehicle.VehicleStatus.IDLE);
            vehicleRepository.save(vehicle);
            return "İKA-" + vehicleId + " zaten hedef noktada.";
        }

        // Dijkstra Algoritması Çalıştırılıyor
        List<Node> path = com.saferoute.saferoute3d.algorithm.DijkstraAlgorithm.calculateShortestPath(source, target, mapGraph.getNodes());

        if (path.isEmpty()) return "Hata: Yol kapalı veya ulaşılamaz.";

        CustomQueue<Node> pathQueue = new CustomQueue<>();
        for (Node n : path) {
            pathQueue.enqueue(n);
        }
        vehicleActiveRoutes.put(vehicleId, pathQueue);

        vehicle.setStatus(Vehicle.VehicleStatus.MOVING);
        vehicleRepository.save(vehicle);

        return "İKA-" + vehicleId + " için rota oluşturuldu. Adım sayısı: " + pathQueue.getSize();
    }

    public String returnToEvacuationPoint(Long vehicleId) {
        Vehicle vehicle = vehicleRepository.findById(vehicleId).orElse(null);
        if (vehicle == null) return "Hata: Arac ID bulunamadi.";

        vehicle.setStatus(Vehicle.VehicleStatus.RETURNING);
        vehicleRepository.save(vehicle);

        return setVehicleTarget(vehicleId, EVAC_X, EVAC_Z);
    }

    // --- SİMUULASYON DÖNGÜSÜ ---

    @Scheduled(fixedRate = 800) // Gerçek zamanlı akış hızı
    public void simulationLoop() {
        List<Vehicle> vehicles = vehicleRepository.findAll();

        for (Vehicle v : vehicles) {
            CustomQueue<Node> route = vehicleActiveRoutes.get(v.getId());

            if (v.getStatus() == Vehicle.VehicleStatus.MOVING && route != null && !route.isEmpty()) {
                Node nextStep = route.dequeue();

                v.setPosX(nextStep.getX());
                v.setPosZ(nextStep.getY()); // Node sınıfındaki Y koordinatı haritada Z'dir

                vehicleRepository.save(v);

                // Eğer rota bittiyse aracı durdur (Frontend bu 'IDLE' bilgisini alıp yeni göreve geçer)
                if (route.isEmpty()) {
                    v.setStatus(Vehicle.VehicleStatus.IDLE);
                    vehicleRepository.save(v);
                    //vehicleActiveRoutes.remove(v.getId());
                }
            }
        }
        // WebSocket üzerinden tüm araçları Frontend'e fırlat
        messagingTemplate.convertAndSend("/topic/vehicles", vehicles);
    }
}
