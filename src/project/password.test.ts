/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import { hashEditPassword, verifyEditPassword } from "./password";

describe("edit password", () => {
  it("verifies PBKDF2 hashes", async () => {
    const { salt, hash } = await hashEditPassword("secret-pass");
    expect(await verifyEditPassword("secret-pass", salt, hash)).toBe(true);
    expect(await verifyEditPassword("wrong", salt, hash)).toBe(false);
  });
});
