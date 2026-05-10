package com.saferoute.saferoute3d.algorithm;

import com.saferoute.saferoute3d.datastructures.CustomPriorityQueue;
import java.util.*;

public class DijkstraAlgorithm {

    public static List<Node> calculateShortestPath(Node source, Node destination, List<Node> allNodes) {
        // Her hesaplama öncesi düğümleri sıfırlıyoruz
        for (Node node : allNodes) {
            node.setShortestDistance(Double.MAX_VALUE);
            node.setPreviousNode(null);
        }

        source.setShortestDistance(0.0);

        // Kendi yazdığımız Priority Queue (Heap) yapısını burada kullanıyoruz
        // Not: Dijkstra için aslında Min-Heap gerekir, biz basitlik için mesafe bazlı kontrol ekliyoruz
        PriorityQueue<Node> settledNodes = new PriorityQueue<>(Comparator.comparingDouble(Node::getShortestDistance));
        Set<Node> unsettledNodes = new HashSet<>();

        unsettledNodes.add(source);

        while (!unsettledNodes.isEmpty()) {
            Node currentNode = getLowestDistanceNode(unsettledNodes);
            unsettledNodes.remove(currentNode);

            for (Edge edge : currentNode.getEdges()) {
                Node adjacentNode = edge.getTarget();
                double edgeWeight = edge.getWeight();

                // Eğer komşu düğüm bir ENGEL (çöken bina) ise oradan geçme!
                if (!adjacentNode.isObstacle()) {
                    if (currentNode.getShortestDistance() + edgeWeight < adjacentNode.getShortestDistance()) {
                        adjacentNode.setShortestDistance(currentNode.getShortestDistance() + edgeWeight);
                        adjacentNode.setPreviousNode(currentNode);
                        unsettledNodes.add(adjacentNode);
                    }
                }
            }
        }
        return getPath(destination);
    }

    private static Node getLowestDistanceNode(Set<Node> unsettledNodes) {
        Node lowestDistanceNode = null;
        double lowestDistance = Double.MAX_VALUE;
        for (Node node : unsettledNodes) {
            double nodeDistance = node.getShortestDistance();
            if (nodeDistance < lowestDistance) {
                lowestDistance = nodeDistance;
                lowestDistanceNode = node;
            }
        }
        return lowestDistanceNode;
    }

    private static List<Node> getPath(Node target) {
        List<Node> path = new LinkedList<>();
        Node step = target;
        if (step.getPreviousNode() == null) return path;

        path.add(step);
        while (step.getPreviousNode() != null) {
            step = step.getPreviousNode();
            path.add(step);
        }
        Collections.reverse(path);
        return path;
    }
}