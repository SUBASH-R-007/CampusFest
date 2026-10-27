import { describe, expect, it } from "vitest";
import { previewEvents, staticPreviewRequest } from "../services/staticPreview";
import { availability, filterEvents } from "../utils/format";

describe("static GitHub Pages preview", () => {
  it("exposes only fictional public events, without private records", () => {
    expect(previewEvents.length).toBe(7);
    expect(
      previewEvents.every((event) => event.preview && !event.canRegister),
    ).toBe(true);
    expect(JSON.stringify(previewEvents)).not.toMatch(
      /password|managementCode|studentId|members|ownerId/,
    );
    expect(availability(previewEvents[0])).toBe("Sample event");
  });
  it("supports the explorer and sample event detail routes", () => {
    expect(staticPreviewRequest("/events/design-jam").mode).toBe("TEAM");
    expect(
      filterEvents(previewEvents, new URLSearchParams("mode=TEAM")),
    ).toHaveLength(1);
    expect(
      filterEvents(previewEvents, new URLSearchParams("period=past")),
    ).toHaveLength(1);
    expect(() => staticPreviewRequest("/events/missing")).toThrow(
      "does not exist",
    );
  });
  it("cannot authenticate, retrieve private passes or perform mutations", () => {
    expect(staticPreviewRequest("/session").organizer).toBeNull();
    expect(() => staticPreviewRequest("/session/login", "POST")).toThrow(
      "cannot save data",
    );
    expect(() => staticPreviewRequest("/passes/lookup", "POST")).toThrow(
      "cannot save data",
    );
    expect(() => staticPreviewRequest("/organizer/events")).toThrow(
      "unavailable",
    );
  });
});
