package com.saferoute.saferoute3d.algorithm;

public class Edge {
    private Node target;
    private double weight;

    public Edge(Node target, double weight) {
        this.target = target;
        this.weight = weight;
    }

    // --- Manuel Getterlar ---
    public Node getTarget() { return target; }
    public double getWeight() { return weight; }
}