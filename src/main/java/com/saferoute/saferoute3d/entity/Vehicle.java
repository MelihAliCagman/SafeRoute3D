package com.saferoute.saferoute3d.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "vehicles")
public class Vehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private double posX;
    private double posY;
    private double posZ;

    private double batteryLevel;

    @Enumerated(EnumType.STRING)
    private VehicleStatus status;

    public enum VehicleStatus {
        IDLE, MOVING, EMERGENCY, RETURNING
    }

    // --- Manuel Getter & Setterlar ---
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public double getPosX() { return posX; }
    public void setPosX(double posX) { this.posX = posX; }

    public double getPosY() { return posY; }
    public void setPosY(double posY) { this.posY = posY; }

    public double getPosZ() { return posZ; }
    public void setPosZ(double posZ) { this.posZ = posZ; }

    public double getBatteryLevel() { return batteryLevel; }
    public void setBatteryLevel(double batteryLevel) { this.batteryLevel = batteryLevel; }

    public VehicleStatus getStatus() { return status; }
    public void setStatus(VehicleStatus status) { this.status = status; }

    // Boş Constructor (Hibernate için şart)
    public Vehicle() {}
}