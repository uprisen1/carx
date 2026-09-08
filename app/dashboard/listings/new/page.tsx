"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NewListingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [form, setForm] = useState({
    make: "",
    model: "",
    year: "",
    price: "",
    mileage: "",
    transmission: "manual",
    fuel_type: "petrol",
    condition: "locally_used",
    location: "",
    description: "",
  });
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in to post a listing.");
      return;
    }

    const { error: insertError } = await supabase.from("listings").insert({
      seller_id: user.id,
      make: form.make,
      model: form.model,
      year: Number(form.year),
      price: Number(form.price),
      mileage: form.mileage ? Number(form.mileage) : null,
      transmission: form.transmission,
      fuel_type: form.fuel_type,
      condition: form.condition,
      location: form.location,
      description: form.description,
      status: "pending", // goes to admin approval queue
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="px-6 py-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">New listing</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          required
          placeholder="Make (e.g. Toyota)"
          className="border rounded px-3 py-2 w-full"
          value={form.make}
          onChange={(e) => setForm({ ...form, make: e.target.value })}
        />
        <input
          required
          placeholder="Model (e.g. Vitz)"
          className="border rounded px-3 py-2 w-full"
          value={form.model}
          onChange={(e) => setForm({ ...form, model: e.target.value })}
        />
        <input
          required
          type="number"
          placeholder="Year"
          className="border rounded px-3 py-2 w-full"
          value={form.year}
          onChange={(e) => setForm({ ...form, year: e.target.value })}
        />
        <input
          required
          type="number"
          placeholder="Price (KES)"
          className="border rounded px-3 py-2 w-full"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
        />
        <input
          type="number"
          placeholder="Mileage (km)"
          className="border rounded px-3 py-2 w-full"
          value={form.mileage}
          onChange={(e) => setForm({ ...form, mileage: e.target.value })}
        />

        <div className="flex gap-3">
          <select
            className="border rounded px-3 py-2 flex-1"
            value={form.transmission}
            onChange={(e) => setForm({ ...form, transmission: e.target.value })}
          >
            <option value="manual">Manual</option>
            <option value="automatic">Automatic</option>
          </select>
          <select
            className="border rounded px-3 py-2 flex-1"
            value={form.fuel_type}
            onChange={(e) => setForm({ ...form, fuel_type: e.target.value })}
          >
            <option value="petrol">Petrol</option>
            <option value="diesel">Diesel</option>
            <option value="hybrid">Hybrid</option>
            <option value="electric">Electric</option>
          </select>
        </div>

        <select
          className="border rounded px-3 py-2 w-full"
          value={form.condition}
          onChange={(e) => setForm({ ...form, condition: e.target.value })}
        >
          <option value="brand_new">Brand new</option>
          <option value="foreign_used">Foreign used</option>
          <option value="locally_used">Locally used</option>
        </select>

        <input
          placeholder="Location (e.g. Nairobi)"
          className="border rounded px-3 py-2 w-full"
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
        />
        <textarea
          placeholder="Description"
          className="border rounded px-3 py-2 w-full h-28"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        {/* Photo upload to Supabase Storage would go here as a separate component */}

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button type="submit" className="bg-black text-white px-5 py-2 rounded-lg w-full">
          Submit for review
        </button>
      </form>
    </main>
  );
}
