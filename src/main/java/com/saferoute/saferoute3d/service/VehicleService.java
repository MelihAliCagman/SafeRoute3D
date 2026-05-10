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

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class VehicleService {

    private final VehicleRepository vehicleRepository;
    private final SimpMessagingTemplate messagingTemplate;

    private CustomGraph mapGraph;
    private CustomHashMap<Long, Vehicle> activeVehiclesMap;
    private CustomHashMap<Long, CustomQueue<Node>> vehicleActiveRoutes;
    private CustomHashMap<Long, CustomStack<Node>> vehicleReturnRoutes;

    @PostConstruct
    public void init() {
        // Başlangıçta veritabanını temizle (Temiz sayfa)
        vehicleRepository.deleteAll();

        mapGraph = new CustomGraph();
        activeVehiclesMap = new CustomHashMap<>();
        vehicleActiveRoutes = new CustomHashMap<>();
        vehicleReturnRoutes = new CustomHashMap<>();

        // 1. GENİŞ HARİTA: 40x40'lık bir ızgara oluştur
        for (int x = -20; x <= 20; x++) {
            for (int z = -20; z <= 20; z++) {
                mapGraph.addNode(new Node(x, z));
            }
        }

        // 2. ŞEHİR YAPISI: Her 5 birimde bir 3x3'lük bina blokları koy, aralar "Cadde" olsun
        for (int x = -15; x <= 15; x += 5) {
            for (int z = -15; z <= 15; z += 5) {
                createBuildingBlock(x, z);
            }
        }

        // 3. YOLLARI BAĞLA: Sadece bina olmayan düğümleri birbirine bağla
        for (Node node : mapGraph.getNodes()) {
            connectNeighbors(node);
        }

        System.out.println("Geniş Şehir Haritası Hazır. Araç Bekleniyor...");
    }

    private void createBuildingBlock(int startX, int startZ) {
        for (int x = startX; x < startX + 3; x++) {
            for (int z = startZ; z < startZ + 3; z++) {
                Node n = mapGraph.getNodeById(x + "," + z);
                if (n != null) n.setObstacle(true);
            }
        }
    }

    private void connectNeighbors(Node node) {
        if (node.isObstacle()) return;
        int x = node.getX(); int z = node.getY();
        int[][] neighbors = {{x+1, z}, {x-1, z}, {x, z+1}, {x, z-1}};
        for (int[] n : neighbors) {
            Node neighbor = mapGraph.getNodeById(n[0] + "," + n[1]);
            if (neighbor != null && !neighbor.isObstacle()) {
                mapGraph.addEdge(node, neighbor, 1.0);
            }
        }
    }

    // --- DIŞARIYA AÇILAN METODLAR (Controller Hatalarını Çözen Kısım) ---

    public List<Vehicle> getAllVehicles() {
        return vehicleRepository.findAll();
    }

    public Vehicle getVehicleFast(Long id) {
        return activeVehiclesMap.get(id);
    }

    public Vehicle addVehicle(String name, double x, double z) {
        Vehicle v = new Vehicle();
        v.setName(name); v.setPosX(x); v.setPosZ(z);
        v.setStatus(Vehicle.VehicleStatus.IDLE);
        v.setBatteryLevel(100.0);

        Vehicle saved = vehicleRepository.save(v);
        activeVehiclesMap.put(saved.getId(), saved);
        vehicleReturnRoutes.put(saved.getId(), new CustomStack<>());
        return saved;
    }

    public String setVehicleTarget(Long vehicleId, int targetX, int targetZ) {
        Vehicle v = vehicleRepository.findById(vehicleId).orElse(null);
        if (v == null) return "Hata: Araç bulunamadı.";

        Node source = mapGraph.getNodeById((int)Math.round(v.getPosX()) + "," + (int)Math.round(v.getPosZ()));
        Node target = mapGraph.getNodeById(targetX + "," + targetZ);

        if (source == null || target == null || target.isObstacle()) return "Hata: Geçersiz hedef.";

        List<Node> path = com.saferoute.saferoute3d.algorithm.DijkstraAlgorithm.calculateShortestPath(source, target, mapGraph.getNodes());
        if (path.isEmpty()) return "Hata: Yol kapalı.";

        CustomQueue<Node> pathQueue = new CustomQueue<>();
        for (Node n : path) pathQueue.enqueue(n);
        vehicleActiveRoutes.put(vehicleId, pathQueue);

        v.setStatus(Vehicle.VehicleStatus.MOVING);
        vehicleRepository.save(v);
        return "İKA-" + vehicleId + " yola çıktı.";
    }

    @Scheduled(fixedRate = 800) // Biraz daha hızlı akış
    public void simulationLoop() {
        List<Vehicle> vehicles = vehicleRepository.findAll();
        for (Vehicle v : vehicles) {
            CustomQueue<Node> route = vehicleActiveRoutes.get(v.getId());
            if (v.getStatus() == Vehicle.VehicleStatus.MOVING && route != null && !route.isEmpty()) {
                Node next = route.dequeue();
                v.setPosX(next.getX()); v.setPosZ(next.getY());
                vehicleRepository.save(v);
                if (route.isEmpty()) {
                    v.setStatus(Vehicle.VehicleStatus.IDLE);
                    vehicleRepository.save(v);
                }
            }
        }
        messagingTemplate.convertAndSend("/topic/vehicles", vehicles);
    }

    public Long findClosestVehicleId(int tx, int tz) {
        List<Vehicle> all = vehicleRepository.findAll();
        Long closest = null; double minD = Double.MAX_VALUE;
        for (Vehicle v : all) {
            double d = Math.sqrt(Math.pow(v.getPosX()-tx,2) + Math.pow(v.getPosZ()-tz,2));
            if (d < minD) { minD = d; closest = v.getId(); }
        }
        return closest;
    }
}