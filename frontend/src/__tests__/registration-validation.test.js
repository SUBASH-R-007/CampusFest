import { describe, expect, it } from "vitest";
import { emptyMember, validateRegistration } from "../utils/validation";

const solo = { mode: "SOLO", minTeamSize: 1, maxTeamSize: 1 };
const team = { mode: "TEAM", minTeamSize: 2, maxTeamSize: 3 };
const person = (suffix, overrides = {}) => ({
  name: `Demo ${suffix}`,
  studentId: `ST-${suffix}`,
  email: `${suffix}@example.test`,
  department: "Computing",
  year: "2",
  ...overrides,
});

describe("registration feedback", () => {
  it("accepts complete solo details without a team name", () => {
    expect(validateRegistration(solo, [person("A")], "", true)).toEqual({});
  });

  it("counts the leader as one of the submitted team members", () => {
    expect(
      validateRegistration(
        team,
        [person("A"), person("B")],
        "Demo makers",
        true,
      ),
    ).toEqual({});
  });

  it("rejects a team below its minimum or above its maximum", () => {
    expect(
      validateRegistration(team, [person("A")], "Demo makers", true).members,
    ).toBeTruthy();
    expect(
      validateRegistration(
        team,
        ["A", "B", "C", "D"].map((id) => person(id)),
        "Demo makers",
        true,
      ).members,
    ).toBeTruthy();
  });

  it("requires a team name and permission confirmation", () => {
    const errors = validateRegistration(
      team,
      [person("A"), person("B")],
      "   ",
      false,
    );
    expect(errors.teamName).toBeTruthy();
    expect(errors.consent).toBeTruthy();
  });

  it("treats case and all whitespace variants of a student ID as duplicates", () => {
    const members = [
      person("A", { studentId: " ST 100 " }),
      person("B", { studentId: "st\t100" }),
    ];
    const errors = validateRegistration(team, members, "Demo makers", true);
    expect(errors["members.1.studentId"]).toBeTruthy();
    expect(members[0].studentId).toBe(" ST 100 "); // Keep display input intact.
  });

  it("rejects duplicate emails after trimming and case normalization", () => {
    const members = [
      person("A", { email: " Person@Example.test " }),
      person("B", { email: "person@example.test" }),
    ];
    expect(
      validateRegistration(team, members, "Demo makers", true)[
        "members.1.email"
      ],
    ).toBeTruthy();
  });

  it("returns participant-specific missing-field and email feedback", () => {
    const errors = validateRegistration(
      solo,
      [person("A", { name: " ", email: "broken-email" })],
      "",
      true,
    );
    expect(errors["members.0.name"]).toBeTruthy();
    expect(errors["members.0.email"]).toBeTruthy();
  });

  it("returns independent empty forms for added members", () => {
    const first = emptyMember();
    const second = emptyMember();
    first.name = "Leader";
    expect(second.name).toBe("");
  });
});
