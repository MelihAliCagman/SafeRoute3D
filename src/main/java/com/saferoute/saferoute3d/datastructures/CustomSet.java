package com.saferoute.saferoute3d.datastructures;

public class CustomSet<T> {

    // Set, aslında değerleri (value) önemsiz olan bir HashMap'tir.
    private CustomHashMap<T, Boolean> map;

    public CustomSet() {
        map = new CustomHashMap<>();
    }

    // Sete eleman ekler (Eğer varsa üzerine yazar, yani tekilleştirir)
    public void add(T item) {
        map.put(item, true);
    }

    // Eleman sette var mı kontrolü
    public boolean contains(T item) {
        return map.get(item) != null;
    }
}