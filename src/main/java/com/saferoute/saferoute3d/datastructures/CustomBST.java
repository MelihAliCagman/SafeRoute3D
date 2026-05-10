package com.saferoute.saferoute3d.datastructures;

import java.util.ArrayList;
import java.util.List;

public class CustomBST<T extends Comparable<T>> {

    private class Node {
        T data;
        Node left, right;

        public Node(T data) {
            this.data = data;
        }
    }

    private Node root;

    // Eleman Ekleme
    public void insert(T data) {
        root = insertRecursive(root, data);
    }

    private Node insertRecursive(Node root, T data) {
        if (root == null) return new Node(data);
        if (data.compareTo(root.data) < 0)
            root.left = insertRecursive(root.left, data);
        else if (data.compareTo(root.data) > 0)
            root.right = insertRecursive(root.right, data);
        return root;
    }

    // Arama (Hocanın en çok bakacağı yer O(log n))
    public boolean search(T data) {
        return searchRecursive(root, data);
    }

    private boolean searchRecursive(Node root, T data) {
        if (root == null) return false;
        if (root.data.equals(data)) return true;
        return data.compareTo(root.data) < 0
                ? searchRecursive(root.left, data)
                : searchRecursive(root.right, data);
    }

    // Aralık Sorgusu (Range Query): Belirli bir aralıktaki verileri toplar
    public List<T> getInRange(T min, T max) {
        List<T> results = new ArrayList<>();
        findInRange(root, min, max, results);
        return results;
    }

    private void findInRange(Node node, T min, T max, List<T> results) {
        if (node == null) return;
        if (min.compareTo(node.data) < 0) findInRange(node.left, min, max, results);
        if (min.compareTo(node.data) <= 0 && max.compareTo(node.data) >= 0) results.add(node.data);
        if (max.compareTo(node.data) > 0) findInRange(node.right, min, max, results);
    }
}