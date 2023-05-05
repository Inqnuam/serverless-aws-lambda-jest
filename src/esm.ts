import { fileURLToPath } from "url";

import * as jest from "jest";
export { readInitialOptions } from "jest-config";
export { jest };

const actualDirName = fileURLToPath(new URL(".", import.meta.url));

export { actualDirName };
