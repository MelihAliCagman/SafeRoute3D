package com.saferoute.saferoute3d.controller;

import com.saferoute.saferoute3d.entity.Vehicle;
import com.saferoute.saferoute3d.service.VehicleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/simulation")
@RequiredArgsConstructor
public class SimulationController {

    private final VehicleService vehicleService;

    // Arayüzden yeni bir sanal araç eklemek için
    @PostMapping("/add-vehicle")
    public ResponseEntity<Vehicle> addVehicle(@RequestParam String name,
                                              @RequestParam double x,
                                              @RequestParam double z) {
        Vehicle newVehicle = vehicleService.addVehicle(name, x, z);
        return ResponseEntity.ok(newVehicle);
    }

    // Sahadaki tüm araçları arayüze liste olarak dönmek için
    @GetMapping("/vehicles")
    public ResponseEntity<List<Vehicle>> getAllVehicles() {
        return ResponseEntity.ok(vehicleService.getAllVehicles());
    }

    @GetMapping("/map/obstacles")
    public ResponseEntity<List<java.util.Map<String, Integer>>> getObstacleCells() {
        return ResponseEntity.ok(vehicleService.getObstacleCells());
    }

    @GetMapping("/map/roads")
    public ResponseEntity<List<java.util.Map<String, Integer>>> getRoadCells() {
        return ResponseEntity.ok(vehicleService.getRoadCells());
    }

    //  1: Heap / Priority Queue Tetikleyicisi
    @PostMapping("/emergency")
    public ResponseEntity<String> triggerEmergency(@RequestParam String taskName, @RequestParam int priorityLevel) {
        // İleride burada yazacağımız PriorityQueue sınıfına acil görev ekleyeceğiz
        return ResponseEntity.ok("Acil görev öncelikli kuyruğa eklendi: " + taskName);
    }

    //  2: Stack (Yığın) Tetikleyicisi
    @PostMapping("/disconnect/{id}")
    public ResponseEntity<String> disconnectVehicle(@PathVariable Long id) {
        // İleride burada aracın sinyalini kesip Stack'ten pop() yaparak geri döndüreceğiz
        return ResponseEntity.ok(id + " ID'li aracın sinyali kesildi. Eve dönüş (Stack/LIFO) başlatıldı.");
    }

    // 3: BST (İkili Arama Ağacı) Log Filtreleme
    @GetMapping("/logs/filter")
    public ResponseEntity<String> getLogsByTimeRange(@RequestParam long startTime, @RequestParam long endTime) {
        // Telemetri loglarını BST içinde arayacağız
        return ResponseEntity.ok("BST üzerinde O(log n) hızında loglar filtrelendi.");
    }

    //  4: Dijkstra Hedef Gönderme
    @PostMapping("/set-target/{id}")
    public ResponseEntity<String> setTarget(@PathVariable Long id, @RequestParam int x, @RequestParam int z) {
        String result = vehicleService.setVehicleTarget(id, x, z);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/return-to-evacuation/{id}")
    public ResponseEntity<String> returnToEvacuation(@PathVariable Long id) {
        String result = vehicleService.returnToEvacuationPoint(id);
        return ResponseEntity.ok(result);
    }

    //  5: Performans Kıyaslaması (Madde 6)
    @GetMapping("/performance-test")
    public ResponseEntity<String> runPerformanceTest() {
        List<Vehicle> allVehicles = vehicleService.getAllVehicles();
        if (allVehicles.isEmpty()) return ResponseEntity.ok("Test için sahada araç yok.");

        // Aranacak rastgele bir aracın ID'sini al
        Long targetId = allVehicles.get(allVehicles.size() / 2).getId();

        // 1. Dizi (Array/List) ile Doğrusal Arama Testi O(n)
        long startTimeArray = System.nanoTime();
        Vehicle foundInArray = null;
        for (Vehicle v : allVehicles) {
            if (v.getId().equals(targetId)) {
                foundInArray = v;
                break;
            }
        }
        long endTimeArray = System.nanoTime();
        double arrayTimeMs = (endTimeArray - startTimeArray) / 1_000_000.0;

        // 2. Kendi yazdığımız HashMap ile Arama Testi O(1)
        long startTimeHash = System.nanoTime();
        Vehicle foundInHash = vehicleService.getVehicleFast(targetId);
        long endTimeHash = System.nanoTime();
        double hashTimeMs = (endTimeHash - startTimeHash) / 1_000_000.0;

        String result = String.format("Arama Testi (%d Araç): Dizi(O(n)): %.4f ms | HashMap(O(1)): %.4f ms",
                allVehicles.size(), arrayTimeMs, hashTimeMs);
        return ResponseEntity.ok(result);
    }
    @GetMapping("/closest-vehicle")
    public ResponseEntity<Long> getClosest(@RequestParam int x, @RequestParam int z) {
        return ResponseEntity.ok(vehicleService.findClosestVehicleId(x, z));
    }
}
