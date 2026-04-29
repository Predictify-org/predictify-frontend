import "@testing-library/jest-dom";
import { randomUUID } from "node:crypto";

if (typeof global.crypto === "undefined") {
  (global as any).crypto = {
    randomUUID: () => randomUUID(),
  };
} else if (typeof global.crypto.randomUUID === "undefined") {
  (global.crypto as any).randomUUID = () => randomUUID();
}
