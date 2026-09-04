import { describe, expect, it } from "vitest";
import { BOOTHS_MAX, VISITORS_MIN } from "../../shared/limits";
import { buildNewProject, emptyBooths, validateCreateInput } from "./createProject";

describe("create project", () => {
  it("rejects missing required fields and out of range values", () => {
    const errors = validateCreateInput({
      title: "",
      password: "12",
      expectedVisitors: 1,
      boothCount: BOOTHS_MAX + 1,
      purpose: "",
      customPurpose: "",
    });
    expect(errors.title).toBeTruthy();
    expect(errors.password).toBeTruthy();
    expect(errors.expectedVisitors).toBeTruthy();
    expect(errors.boothCount).toBeTruthy();
    expect(errors.purpose).toBeTruthy();
  });

  it("requires custom purpose text", () => {
    const errors = validateCreateInput({
      title: "봄 축제",
      password: "abcd",
      expectedVisitors: VISITORS_MIN,
      boothCount: 3,
      purpose: "custom",
      customPurpose: "",
    });
    expect(errors.customPurpose).toBeTruthy();
  });

  it("builds booth cards matching the count and never stores the password", () => {
    const project = buildNewProject(
      {
        title: "봄 축제",
        password: "secret-pass",
        expectedVisitors: 200,
        boothCount: 4,
        purpose: "market",
        customPurpose: "",
      },
      { salt: "s", hash: "h" },
    );
    expect(project.booths).toHaveLength(4);
    expect(emptyBooths(4)).toHaveLength(4);
    expect(JSON.stringify(project)).not.toContain("secret-pass");
    expect(project.passwordHash).toBe("h");
  });
});
