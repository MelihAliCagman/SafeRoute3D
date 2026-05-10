package com.saferoute.saferoute3d.datastructures;

public class CustomQueue<T> {

    private static class Node<T> {
        T data;
        Node<T> next;

        public Node(T data) {
            this.data = data;
        }
    }

    private Node<T> front; // Kuyruğun başı (Çıkış)
    private Node<T> rear;  // Kuyruğun sonu (Giriş)
    private int size;

    public CustomQueue() {
        this.front = this.rear = null;
        this.size = 0;
    }

    // Kuyruğa eleman ekleme
    public void enqueue(T item) {
        Node<T> newNode = new Node<>(item);
        if (this.rear == null) {
            this.front = this.rear = newNode;
        } else {
            this.rear.next = newNode;
            this.rear = newNode;
        }
        size++;
    }

    // Kuyruktan eleman çıkarma
    public T dequeue() {
        if (this.front == null) {
            return null;
        }
        T item = this.front.data;
        this.front = this.front.next;

        if (this.front == null) {
            this.rear = null;
        }
        size--;
        return item;
    }

    public boolean isEmpty() {
        return front == null;
    }

    public int getSize() {
        return size;
    }
}