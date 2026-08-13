"use client";

import { useEffect, useRef, useState } from "react";

type Option = { id: string; name: string };

export function LocationCombobox({
  label,
  required,
  options,
  loading,
  disabled,
  selectedLabel,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  clearLabel,
  onSelect,
  onClear,
}: {
  label: string;
  required?: boolean;
  options: Option[];
  loading?: boolean;
  disabled?: boolean;
  selectedLabel: string;
  placeholder: string;
  searchPlaceholder?: string;
  emptyMessage: string;
  clearLabel?: string;
  onSelect: (option: Option) => void;
  onClear?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const filtered = options.filter((option) =>
    option.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div ref={rootRef} className="relative">
      <label className="text-xs font-medium text-slate-500">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        className="mt-1 flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
      >
        <span className={selectedLabel ? "" : "text-slate-400"}>
          {selectedLabel || placeholder}
        </span>
        <span className="text-xs text-slate-400">▾</span>
      </button>

      {open && !disabled && (
        <div className="absolute left-0 top-full z-30 mt-1 w-full min-w-[14rem] rounded-xl border border-slate-200 bg-white shadow-lg">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder ?? `Search ${label.toLowerCase()}…`}
            className="w-full border-b border-slate-100 px-3 py-2 text-sm focus:outline-none"
          />
          <div className="max-h-48 overflow-y-auto py-1">
            {onClear && (
              <button
                type="button"
                onClick={() => {
                  onClear();
                  setOpen(false);
                  setQuery("");
                }}
                className="block w-full px-3 py-1.5 text-left text-sm text-slate-500 hover:bg-slate-50"
              >
                {clearLabel ?? "Any"}
              </button>
            )}

            {loading ? (
              <p className="px-3 py-2 text-sm text-slate-400">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-slate-400">{emptyMessage}</p>
            ) : (
              filtered.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    onSelect(option);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  {option.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
