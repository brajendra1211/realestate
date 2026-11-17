"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, Expand, ImageOff, X } from "lucide-react";

type GalleryImage = { id: string; url: string; category?: string };

export function PropertyGallery({
  images,
  title,
}: {
  images: GalleryImage[];
  title: string;
  /** @deprecated no longer rendered — the "people contacted" badge was fabricated. */
  contactedCount?: number;
}) {
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const count = images.length;

  const go = useCallback(
    (delta: number) => setIndex((i) => (i + delta + count) % count),
    [count],
  );

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [lightbox, go]);

  if (count === 0) {
    return (
      <div className="flex aspect-[16/10] flex-col items-center justify-center gap-2 rounded-[24px] bg-slate-100 text-slate-400">
        <ImageOff className="h-8 w-8" />
        <span className="text-sm font-medium">No photos available</span>
      </div>
    );
  }

  const current = images[index] ?? images[0];

  return (
    <div className="flex flex-col gap-3">
      <div className="group relative aspect-[16/10] w-full overflow-hidden rounded-[24px] bg-slate-900 shadow-soft">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={current.id || current.url}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <Image
              src={current.url}
              alt={title}
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 60vw, 100vw"
              priority
            />
          </motion.div>
        </AnimatePresence>

        <div className="absolute inset-0 bg-gradient-to-t from-ink/50 via-transparent to-transparent" />

        {count > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              onClick={() => go(-1)}
              className="glass absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-ink opacity-0 shadow-lg transition group-hover:opacity-100 hover:scale-105"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Next photo"
              onClick={() => go(1)}
              className="glass absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-ink opacity-0 shadow-lg transition group-hover:opacity-100 hover:scale-105"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        <div className="absolute bottom-3 left-3 glass-dark rounded-full px-3 py-1.5 text-xs font-semibold text-white">
          {index + 1} / {count}
        </div>
        <button
          type="button"
          onClick={() => setLightbox(true)}
          className="glass absolute bottom-3 right-3 inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold text-ink shadow-lg transition hover:scale-105"
        >
          <Expand className="h-3.5 w-3.5" /> View full screen
        </button>
      </div>

      {count > 1 && (
        <div className="no-scrollbar flex items-center gap-2.5 overflow-x-auto py-1">
          {images.map((img, i) => (
            <button
              key={img.id || i}
              type="button"
              onClick={() => setIndex(i)}
              className={`relative h-16 w-24 shrink-0 cursor-pointer overflow-hidden rounded-xl transition-all duration-300 ${
                index === i
                  ? "scale-100 ring-2 ring-brand-600 ring-offset-2"
                  : "opacity-60 hover:opacity-100"
              }`}
            >
              <Image src={img.url} alt={`${title} photo ${i + 1}`} fill className="object-cover" sizes="96px" />
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {lightbox && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/95 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(false)}
          >
            <button
              type="button"
              aria-label="Close"
              onClick={() => setLightbox(false)}
              className="absolute right-5 top-5 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
            {count > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous photo"
                  onClick={(e) => {
                    e.stopPropagation();
                    go(-1);
                  }}
                  className="absolute left-4 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  aria-label="Next photo"
                  onClick={(e) => {
                    e.stopPropagation();
                    go(1);
                  }}
                  className="absolute right-4 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
            <motion.div
              key={current.url}
              className="relative h-[82vh] w-[92vw] max-w-6xl"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
            >
              <Image src={current.url} alt={title} fill className="object-contain" sizes="92vw" />
            </motion.div>
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-white">
              {index + 1} / {count}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
