package com.saferoute.saferoute3d.datastructures;

public class CustomStack<T> {

    // Stack'in her bir elemanını tutacak iç sınıf (Bağlı Liste düğümü mantığı)
    private static class Node<T> {
        private T data;
        private Node<T> next;

        public Node(T data) {
            this.data = data;
        }
    }

    private Node<T> top; // Stack'in en üstündeki eleman
    private int size;

    public CustomStack() {
        this.top = null;
        this.size = 0;
    }

    // Stack'e eleman ekleme (LIFO - Son giren ilk çıkar)
    public void push(T item) {
        Node<T> newNode = new Node<>(item);
        newNode.next = top;
        top = newNode;
        size++;
    }

    // Stack'ten eleman çıkarma (Geri dönüş için kullanacağız)
    public T pop() {
        if (isEmpty()) {
            throw new RuntimeException("Stack boş, çıkarılacak eleman yok!");
        }
        T item = top.data;
        top = top.next; // Top bir alttaki elemana kayar
        size--;
        return item;
    }

    // En üstteki elemana bakma (çıkarmadan)
    public T peek() {
        if (isEmpty()) {
            return null;
        }
        return top.data;
    }

    public boolean isEmpty() {
        return top == null;
    }

    public int getSize() {
        return size;
    }
}