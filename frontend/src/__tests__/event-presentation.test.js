import { describe, expect, it } from "vitest";
import {
  availability,
  dateTime,
  filterEvents,
  inputDate,
  isBeforeStart,
  utcDate,
} from "../utils/format";

const events = [
  {
    id: "past",
    title: "Old CodeSprint",
    description: "Coding",
    venue: "Lab",
    category: "Technology",
    mode: "SOLO",
    phase: "completed",
    startAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "soon",
    title: "Design Jam",
    description: "Build together",
    venue: "Studio",
    category: "Design",
    mode: "TEAM",
    phase: "upcoming",
    startAt: "2026-11-01T00:00:00Z",
  },
  {
    id: "later",
    title: "CodeSprint",
    description: "Coding",
    venue: "Lab",
    category: "Technology",
    mode: "SOLO",
    phase: "upcoming",
    startAt: "2026-12-01T00:00:00Z",
  },
  {
    id: "now",
    title: "RoboRally",
    description: "Robotics",
    venue: "Workshop",
    category: "Technology",
    mode: "SOLO",
    phase: "ongoing",
    startAt: "2026-10-12T00:00:00Z",
  },
];

describe("IST time and availability", () => {
  it("converts UTC across midnight into Asia/Kolkata editor time", () => {
    expect(inputDate("2026-10-12T23:00:00Z")).toBe("2026-10-13T04:30");
    expect(utcDate("2026-10-13T04:30")).toBe("2026-10-12T23:00:00.000Z");
  });

  it("formats the IST day and time independently of the host timezone", () => {
    const display = dateTime("2026-10-12T23:00:00Z");
    expect(display).toContain("13 Oct 2026");
    expect(display.toLowerCase()).toMatch(/4:30\s*am/);
  });

  it("distinguishes available seats, available teams, waitlist and closed", () => {
    expect(
      availability({
        canRegister: true,
        availability: "available",
        availableUnits: 2,
        unit: "seats",
      }),
    ).toBe("2 seats available");
    expect(
      availability({
        canRegister: true,
        availability: "available",
        availableUnits: 2,
        unit: "teams",
      }),
    ).toBe("2 teams available");
    expect(availability({ canRegister: true, availability: "waitlist" })).toBe(
      "Waiting list open",
    );
    expect(availability({ canRegister: false, availability: "closed" })).toBe(
      "Registration closed",
    );
  });

  it("uses the server time for cancellation eligibility and excludes event start", () => {
    const event = {
      startAt: "2030-01-01T12:00:00Z",
      serverNow: "2030-01-01T11:59:59Z",
    };
    expect(isBeforeStart(event)).toBe(true);
    expect(isBeforeStart({ ...event, serverNow: event.startAt })).toBe(false);
  });
});

describe("event URL filters", () => {
  it("defaults to upcoming and ongoing events in earliest date order", () => {
    expect(
      filterEvents(events, new URLSearchParams()).map((event) => event.id),
    ).toEqual(["now", "soon", "later"]);
  });

  it("combines search, category and mode from a reloadable query string", () => {
    const query = new URLSearchParams(
      "q=DESIGN&category=Design&mode=TEAM&period=upcoming",
    );
    expect(filterEvents(events, query).map((event) => event.id)).toEqual([
      "soon",
    ]);
  });

  it("supports past-only and all-date reverse sorting without mutating input", () => {
    expect(
      filterEvents(events, new URLSearchParams("period=past")).map(
        (event) => event.id,
      ),
    ).toEqual(["past"]);
    expect(
      filterEvents(events, new URLSearchParams("period=all&sort=latest")).map(
        (event) => event.id,
      ),
    ).toEqual(["later", "soon", "now", "past"]);
    expect(events[0].id).toBe("past");
  });

  it("returns an empty result when filter criteria do not match", () => {
    expect(
      filterEvents(events, new URLSearchParams("q=missing-event")),
    ).toEqual([]);
  });
});
