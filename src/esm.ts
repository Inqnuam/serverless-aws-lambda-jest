import { fileURLToPath } from "url";

export default fileURLToPath(new URL(".", import.meta.url));
