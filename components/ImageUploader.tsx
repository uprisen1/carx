"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ListingImage } from "@/lib/supabase/types";

interface Props {
  listingId: string;
  onUploaded?: (urls: string[]) => void;
}

const BUCKET = "listing-images";

// Works out the storage file path from a public image URL
function storagePathFromUrl(url: string) {
  const marker = `/${BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length));
}

function messageOf(err: unknown) {
  return (err as { message?: string })?.message ?? "Something went wrong.";
}

export default function ImageUploader({ listingId, onUploaded }: Props) {
  const [supabase] = useState(() => createClient());
  const [images, setImages] = useState<ListingImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load photos already saved for this listing
  useEffect(() => {
    let active = true;
    supabase
      .from("listing_images")
      .select("*")
      .eq("listing_id", listingId)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (active && data) setImages(data);
      });
    return () => {
      active = false;
    };
  }, [listingId, supabase]);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const files = Array.from(input.files ?? []);
    if (files.length === 0) return;

    setUploading(true);
    setError(null);
    const added: ListingImage[] = [];

    try {
      // New photos go after the ones already there
      let next = images.length ? Math.max(...images.map((i) => i.sort_order)) + 1 : 0;

      for (const file of files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${listingId}/${Date.now()}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { upsert: false });
        if (uploadError) throw uploadError;

        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

        const { data: row, error: insertError } = await supabase
          .from("listing_images")
          .insert({ listing_id: listingId, url: pub.publicUrl, sort_order: next })
          .select()
          .single();
        if (insertError || !row) throw insertError ?? new Error("Could not save photo.");

        added.push(row);
        next += 1;
      }
    } catch (err) {
      setError(messageOf(err));
    } finally {
      if (added.length) {
        setImages((prev) => [...prev, ...added]);
        onUploaded?.(added.map((a) => a.url));
      }
      setUploading(false);
      input.value = ""; // lets you pick the same file again if needed
    }
  }

  async function removeImage(img: ListingImage) {
    setBusyId(img.id);
    setError(null);

    const { error: deleteError } = await supabase
      .from("listing_images")
      .delete()
      .eq("id", img.id);

    if (deleteError) {
      setError(deleteError.message);
      setBusyId(null);
      return;
    }

    // Also delete the file itself so it doesn't pile up in storage
    const path = storagePathFromUrl(img.url);
    if (path) await supabase.storage.from(BUCKET).remove([path]);

    setImages((prev) => prev.filter((i) => i.id !== img.id));
    setBusyId(null);
  }

  async function makeCover(img: ListingImage) {
    setBusyId(img.id);
    setError(null);

    const reordered = [img, ...images.filter((i) => i.id !== img.id)].map((i, idx) => ({
      ...i,
      sort_order: idx,
    }));

    const results = await Promise.all(
      reordered.map((i) =>
        supabase.from("listing_images").update({ sort_order: i.sort_order }).eq("id", i.id)
      )
    );
    const failed = results.find((r) => r.error);

    if (failed?.error) setError(failed.error.message);
    else setImages(reordered);
    setBusyId(null);
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">Car photos</label>
      <input
        type="file"
        accept="image/*"
        multiple
        disabled={uploading}
        onChange={handleFiles}
        className="border rounded px-3 py-2 w-full text-sm"
      />
      <p className="text-xs text-gray-500">
        Photos upload as soon as you pick them. The first photo is the cover shown on Browse.
      </p>
      {uploading && <p className="text-sm text-gray-500">Uploading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((img, idx) => (
            <div key={img.id} className="border rounded-lg overflow-hidden bg-white">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={`Car photo ${idx + 1}`} className="h-24 w-full object-cover" />
                {idx === 0 && (
                  <span className="absolute top-1 left-1 bg-black text-white text-[10px] px-1.5 py-0.5 rounded">
                    Cover
                  </span>
                )}
              </div>
              <div className="flex justify-between p-1.5 text-xs">
                {idx !== 0 ? (
                  <button
                    type="button"
                    disabled={busyId === img.id}
                    onClick={() => makeCover(img)}
                    className="text-blue-600"
                  >
                    Make cover
                  </button>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  disabled={busyId === img.id}
                  onClick={() => removeImage(img)}
                  className="text-red-600"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
