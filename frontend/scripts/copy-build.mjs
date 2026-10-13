import { cp, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const destination = fileURLToPath(
  new URL("../../backend/public/", import.meta.url),
);
await mkdir(destination, { recursive: true });
await cp(fileURLToPath(new URL("../dist/", import.meta.url)), destination, {
  recursive: true,
});
console.log("Frontend copied to backend/public; PHP entry points preserved.");
