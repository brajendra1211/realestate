"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { IMAGE_CATEGORIES, IMAGE_CATEGORY_LABELS } from "@/lib/format";

type GalleryImage = { id: string; url: string; category: string };

export function PropertyGallery({ images, title }: { images: GalleryImage[]; title: string }) {
  const availableCategories = useMemo(
    () => IMAGE_CATEGORIES.filter((category) => images.some((image) => image.category === category)),
    [images]
  );
  const [active, setActive] = useState<string>("ALL");

  if (images.length === 0) {
    return (
      <div className="flex aspect-[16/6] items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        No photos available
      </div>
    );
  }

  const visible = active === "ALL" ? images : images.filter((image) => image.category === active);

  return (
    <div>
      {availableCategories.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActive("ALL")}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              active === "ALL" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All ({images.length})
          </button>
          {availableCategories.map((category) => {
            const count = images.filter((image) => image.category === category).length;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setActive(category)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  active === category
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {IMAGE_CATEGORY_LABELS[category]} ({count})
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100 sm:col-span-2 sm:row-span-2">
          <Image
            src={visible[0].url}
            alt={`${title} — ${IMAGE_CATEGORY_LABELS[visible[0].category] ?? "photo"}`}
            fill
            className="object-cover"
            sizes="(min-width: 640px) 50vw, 100vw"
            priority
          />
        </div>
        {visible.slice(1, 5).map((image) => (
          <div
            key={image.id}
            className="relative hidden aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100 sm:block"
          >
            <Image
              src={image.url}
              alt={`${title} — ${IMAGE_CATEGORY_LABELS[image.category] ?? "photo"}`}
              fill
              className="object-cover"
              sizes="25vw"
            />
          </div>
        ))}
      </div>

      {visible.length > 5 && (
        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {visible.slice(5).map((image) => (
            <div key={image.id} className="relative aspect-square overflow-hidden rounded-xl bg-slate-100">
              <Image
                src={image.url}
                alt={`${title} — ${IMAGE_CATEGORY_LABELS[image.category] ?? "photo"}`}
                fill
                className="object-cover"
                sizes="(min-width: 640px) 16vw, 33vw"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
