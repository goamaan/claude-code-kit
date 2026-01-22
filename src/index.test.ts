import { describe, it, expect } from "vitest";
import { VERSION, NAME } from "./index.js";

describe("claude-code-kit", () => {
  describe("exports", () => {
    it("should export VERSION", () => {
      expect(VERSION).toBe("0.1.0");
    });

    it("should export NAME", () => {
      expect(NAME).toBe("claude-code-kit");
    });
  });

  describe("smoke test", () => {
    it("should be importable", async () => {
      const module = await import("./index.js");
      expect(module).toBeDefined();
      expect(module.VERSION).toBeDefined();
      expect(module.NAME).toBeDefined();
    });
  });
});
