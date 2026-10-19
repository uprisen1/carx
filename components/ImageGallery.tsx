"use client";

import { useState } from "react";
import Image from "next/image";

interface Props {
  images: string[];
  alt: string;
}

export default function ImageGallery({ images, alt }: Props) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="w-full h-72 bg-gray-100 rounded-lg flex items-center justify-center text-sm text-gray-400">
        No photos yet
      </div>
    );
  }

  return (
    <div>
      <div className="relative w-full h-72 bg-gray-100 rounded-lg overflow-hidden">
        <Image src={images[active]} alt={alt} fill className="object-cover" />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 mt-2 overflow-x-auto">
          {images.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setActive(i)}
              className={`relative h-16 w-20 shrink-0 rounded overflow-hidden border-2 ${
                i === active ? "border-black" : "border-transparent"
              }`}
            >
              <Image src={url} alt={`${alt} photo ${i + 1}`} fill className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
