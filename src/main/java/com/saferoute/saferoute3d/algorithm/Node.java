package com.saferoute.saferoute3d.algorithm;

import java.util.ArrayList;
import java.util.List;

public class Node {
    private String id;
    private int x;
    private int y;
    private boolean isObstacle;
    private List<Edge> edges = new ArrayList<>();
    private double shortestDistance = Double.MAX_VALUE;
    private Node previousNode = null;

    public Node(int x, int y) {
        this.x = x;
        this.y = y;
        this.id = x + "," + y;
        this.isObstacle = false;
    }

    public void addDestination(Node destination, double distance) {
        edges.add(new Edge(destination, distance));
    }

    // --- Manuel Getter & Setterlar ---
    public String getId() { return id; }
    public int getX() { return x; }
    public int getY() { return y; }

    public boolean isObstacle() { return isObstacle; }
    public void setObstacle(boolean obstacle) { isObstacle = obstacle; }

    public List<Edge> getEdges() { return edges; }

    public double getShortestDistance() { return shortestDistance; }
    public void setShortestDistance(double shortestDistance) { this.shortestDistance = shortestDistance; }

    public Node getPreviousNode() { return previousNode; }
    public void setPreviousNode(Node previousNode) { this.previousNode = previousNode; }
}