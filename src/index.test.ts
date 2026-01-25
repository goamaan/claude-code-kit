import { describe, it, expect } from "vitest";
import { VERSION, NAME } from "./index.js";

describe("claudeops", () => {
  describe("exports", () => {
    it("should export VERSION", () => {
      expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it("should export NAME", () => {
      expect(NAME).toBe("claudeops");
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
