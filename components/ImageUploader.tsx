"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  listingId: string;
  onUploaded?: (urls: string[]) => void;
}

const BUCKET = "listing-images";

export default function ImageUploader({ listingId, onUploaded }: Props) {
  const supabase = createClient();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);
    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const path = `${listingId}/${Date.now()}-${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { upsert: false });

        if (uploadError) throw uploadError;

        const { data: publicUrl } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(path);

        uploadedUrls.push(publicUrl.publicUrl);

        // Record the image against the listing so it shows up in listing_images
        const { error: insertError } = await supabase
          .from("listing_images")
          .insert({
            listing_id: listingId,
            url: publicUrl.publicUrl,
            sort_order: i,
          });

        if (insertError) throw insertError;
      }

      setPreviews((prev) => [...prev, ...uploadedUrls]);
      onUploaded?.(uploadedUrls);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
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
      {uploading && <p className="text-sm text-gray-500">Uploading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {previews.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {previews.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={url} src={url} alt="Uploaded car" className="h-20 w-full object-cover rounded" />
          ))}
        </div>
      )}
    </div>
  );
}
