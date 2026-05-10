package com.saferoute.saferoute3d.datastructures;

import com.saferoute.saferoute3d.algorithm.Node;
import java.util.ArrayList;
import java.util.List;

public class CustomGraph {

    // Graf içindeki tüm düğümlerin listesi
    private List<Node> nodes;

    public CustomGraph() {
        this.nodes = new ArrayList<>();
    }

    // Haritaya yeni bir koordinat/kavşak ekler
    public void addNode(Node node) {
        nodes.add(node);
    }

    // İki koordinat arasına yol çizer (İki yönlü yol)
    public void addEdge(Node source, Node destination, double distance) {
        source.addDestination(destination, distance);
        destination.addDestination(source, distance); // Yollar gidiş-dönüş olduğu için
    }

    // Haritadaki tüm noktaları getirir
    public List<Node> getNodes() {
        return nodes;
    }

    // Belirli bir ID'ye sahip düğümü bulur
    public Node getNodeById(String id) {
        for (Node node : nodes) {
            if (node.getId().equals(id)) {
                return node;
            }
        }
        return null;
    }
}