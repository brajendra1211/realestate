export function readAmenitiesFromForm(formData: FormData): string | null {
  const values = formData
    .getAll("amenities")
    .map((value) => String(value).trim())
    .filter(Boolean);
  return values.length > 0 ? values.join("\n") : null;
}

export function parseAmenitiesString(amenities: string | null): string[] {
  if (!amenities) return [];
  return amenities
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
