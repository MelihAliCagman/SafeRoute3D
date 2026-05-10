package com.saferoute.saferoute3d.datastructures;

import java.util.ArrayList;
import java.util.List;

public class CustomPriorityQueue<T> {

    // Görevleri ve onların öncelik derecelerini tutan iç sınıf
    public static class PriorityNode<T> {
        public T data;
        public int priority; // Yüksek sayı = Yüksek öncelik (Örn: 10 Acil, 1 Normal)

        public PriorityNode(T data, int priority) {
            this.data = data;
            this.priority = priority;
        }
    }

    // Arka planda Dinamik Dizi (Array) kullanıyoruz (Dizi şartını da sağlamış oluyoruz)
    private List<PriorityNode<T>> heap;

    public CustomPriorityQueue() {
        heap = new ArrayList<>();
    }

    // Yeni görev ekleme ve Heap kuralına göre yukarı taşıma (Heapify-Up)
    public void insert(T item, int priority) {
        PriorityNode<T> newNode = new PriorityNode<>(item, priority);
        heap.add(newNode);
        heapifyUp(heap.size() - 1);
    }

    // En yüksek öncelikli görevi çekme (Heapify-Down)
    public T extractMax() {
        if (heap.isEmpty()) {
            return null;
        }

        T maxData = heap.get(0).data;
        PriorityNode<T> lastNode = heap.remove(heap.size() - 1);

        if (!heap.isEmpty()) {
            heap.set(0, lastNode);
            heapifyDown(0);
        }
        return maxData;
    }

    // Yeni eklenen elemanı önceliğine göre ağaçta yukarı tırmandırır
    private void heapifyUp(int index) {
        int parentIndex = (index - 1) / 2;
        while (index > 0 && heap.get(index).priority > heap.get(parentIndex).priority) {
            swap(index, parentIndex);
            index = parentIndex;
            parentIndex = (index - 1) / 2;
        }
    }

    // En üstten eleman çekildiğinde, yeni gelen elemanı aşağı doğru kaydırır
    private void heapifyDown(int index) {
        int leftChild = 2 * index + 1;
        int rightChild = 2 * index + 2;
        int largest = index;

        if (leftChild < heap.size() && heap.get(leftChild).priority > heap.get(largest).priority) {
            largest = leftChild;
        }
        if (rightChild < heap.size() && heap.get(rightChild).priority > heap.get(largest).priority) {
            largest = rightChild;
        }
        if (largest != index) {
            swap(index, largest);
            heapifyDown(largest);
        }
    }

    private void swap(int i, int j) {
        PriorityNode<T> temp = heap.get(i);
        heap.set(i, heap.get(j));
        heap.set(j, temp);
    }

    public boolean isEmpty() {
        return heap.isEmpty();
    }
}