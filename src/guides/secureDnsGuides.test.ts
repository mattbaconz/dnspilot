import { describe, expect, it } from "vitest";
import { secureDnsGuides } from "./secureDnsGuides";

describe("secureDnsGuides", () => {
  it("ships only Chrome guidance in the current build", () => {
    expect(secureDnsGuides.map((guide) => guide.id)).toEqual(["chrome"]);
    expect(secureDnsGuides[0]?.title).toBe("Chrome");
  });
});
