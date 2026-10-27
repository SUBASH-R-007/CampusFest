export const STATIC_PREVIEW = import.meta.env.VITE_STATIC_PREVIEW === true;

export function assetPath(path) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
}
