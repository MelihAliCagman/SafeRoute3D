package com.saferoute.saferoute3d.datastructures;

public class CustomHashMap<K, V> {

    private static class Entry<K, V> {
        K key;
        V value;
        Entry<K, V> next;

        public Entry(K key, V value) {
            this.key = key;
            this.value = value;
        }
    }

    private Entry<K, V>[] buckets;
    private int capacity = 16; // Başlangıç boyutu

    @SuppressWarnings("unchecked")
    public CustomHashMap() {
        buckets = new Entry[capacity];
    }

    // Basit bir Hash fonksiyonu
    private int getHash(K key) {
        return Math.abs(key.hashCode()) % capacity;
    }

    public void put(K key, V value) {
        int index = getHash(key);
        Entry<K, V> newEntry = new Entry<>(key, value);

        if (buckets[index] == null) {
            buckets[index] = newEntry;
        } else {
            // Çakışma yönetimi: Mevcut listenin sonuna ekle
            Entry<K, V> current = buckets[index];
            while (current.next != null) {
                if (current.key.equals(key)) {
                    current.value = value; // Güncelleme
                    return;
                }
                current = current.next;
            }
            current.next = newEntry;
        }
    }

    public V get(K key) {
        int index = getHash(key);
        Entry<K, V> current = buckets[index];
        while (current != null) {
            if (current.key.equals(key)) return current.value;
            current = current.next;
        }
        return null;
    }
}