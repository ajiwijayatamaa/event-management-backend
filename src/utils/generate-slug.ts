// Dari AI, MINTA AI UNTUK BUATKAN FUNGSI generate slug berdasarkan tittle
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD") // handle unicode
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9\s-]/g, "") // remove special characters
    .trim()
    .replace(/\s+/g, "-") // replace spaces with dash
    .replace(/-+/g, "-"); // remove duplicate dash
}
