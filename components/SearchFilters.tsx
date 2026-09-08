"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function SearchFilters() {
  const router = useRouter();
  const params = useSearchParams();

  const [make, setMake] = useState(params.get("make") ?? "");
  const [minPrice, setMinPrice] = useState(params.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(params.get("maxPrice") ?? "");
  const [transmission, setTransmission] = useState(params.get("transmission") ?? "");

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams();
    if (make) next.set("make", make);
    if (minPrice) next.set("minPrice", minPrice);
    if (maxPrice) next.set("maxPrice", maxPrice);
    if (transmission) next.set("transmission", transmission);
    router.push(`/listings?${next.toString()}`);
  }

  return (
    <form onSubmit={applyFilters} className="flex flex-wrap gap-3 bg-white p-4 rounded-lg border">
      <input
        placeholder="Make (e.g. Toyota)"
        value={make}
        onChange={(e) => setMake(e.target.value)}
        className="border rounded px-3 py-2 flex-1 min-w-[140px]"
      />
      <input
        placeholder="Min price"
        type="number"
        value={minPrice}
        onChange={(e) => setMinPrice(e.target.value)}
        className="border rounded px-3 py-2 w-32"
      />
      <input
        placeholder="Max price"
        type="number"
        value={maxPrice}
        onChange={(e) => setMaxPrice(e.target.value)}
        className="border rounded px-3 py-2 w-32"
      />
      <select
        value={transmission}
        onChange={(e) => setTransmission(e.target.value)}
        className="border rounded px-3 py-2"
      >
        <option value="">Any transmission</option>
        <option value="manual">Manual</option>
        <option value="automatic">Automatic</option>
      </select>
      <button type="submit" className="bg-black text-white px-5 py-2 rounded">
        Search
      </button>
    </form>
  );
}
