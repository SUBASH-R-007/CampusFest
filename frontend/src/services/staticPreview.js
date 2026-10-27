// Public fictional content only. No participant records or authentication data.
// Relative dates keep this explicitly labelled design preview browsable.
const now = new Date();
const at = (days, hours = 0) =>
  new Date(now.getTime() + (days * 24 + hours) * 3600000).toISOString();
const examples = [
  [
    "two-seat-lab",
    "The Two-Seat Lab",
    "Workshop",
    "design",
    "Learning Studio · Block A",
    "Try a hands-on campus workshop in a small group.",
    2,
    "SOLO",
    2,
  ],
  [
    "codesprint",
    "CodeSprint",
    "Technology",
    "code",
    "Innovation Lab · Block A",
    "Explore creative programming challenges and share what you learned with fellow students.",
    3,
    "SOLO",
    30,
  ],
  [
    "design-jam",
    "Design Jam",
    "Design",
    "design",
    "Design Studio · Creative Block",
    "Build a team, explore a campus problem and present a thoughtful prototype.",
    5,
    "TEAM",
    12,
  ],
  [
    "robo-rally",
    "RoboRally",
    "Technology",
    "code",
    "Robotics Workshop · Block B",
    "Meet student makers and discover practical robotics demonstrations.",
    4,
    "SOLO",
    20,
  ],
  [
    "lenscraft",
    "LensCraft",
    "Arts",
    "campus",
    "Library Courtyard",
    "Explore composition, light and storytelling during a campus photo walk.",
    6,
    "SOLO",
    40,
  ],
  [
    "open-mic",
    "Open Mic",
    "Culture",
    "stage",
    "The Amphitheatre",
    "Share a song, a poem or a short story on a welcoming student stage.",
    7,
    "SOLO",
    24,
  ],
  [
    "past-showcase",
    "Campus Makers Showcase",
    "Design",
    "design",
    "Exhibition Hall",
    "Look back at student experiments and working prototypes in this sample past event.",
    -3,
    "SOLO",
    40,
  ],
];
export const previewEvents = examples.map(
  ([
    slug,
    title,
    category,
    image,
    venue,
    description,
    days,
    mode,
    capacity,
  ]) => ({
    id: `PREVIEW-${slug}`,
    slug,
    title,
    category,
    venue,
    mode,
    capacity,
    image: `/images/${image}.jpg`,
    description: `${description}\n\nFictional example for the GitHub Pages preview. Dates are illustrative, not a live event schedule.`,
    rules:
      "This event is a design example. Registration is unavailable on this site.",
    startAt: at(days),
    endAt: at(days, 3),
    registrationOpensAt: at(days - 10),
    registrationDeadline: at(days - 1),
    minTeamSize: mode === "TEAM" ? 2 : 1,
    maxTeamSize: mode === "TEAM" ? 4 : 1,
    contact: "Sample content only",
    status: "published",
    phase: days < 0 ? "completed" : "upcoming",
    unit: mode === "TEAM" ? "teams" : "seats",
    confirmedCount: 0,
    availableUnits: capacity,
    canRegister: false,
    availability: "closed",
    preview: true,
  }),
);

export function staticPreviewRequest(path, method = "GET") {
  if (method !== "GET")
    throw new Error(
      "This GitHub Pages preview cannot save data. The PHP backend is not hosted here.",
    );
  if (path === "/session")
    return {
      organizer: null,
      config: { campusName: "THE CAMPUS COLLECTIVE", logo: "" },
    };
  if (path === "/events") return previewEvents;
  if (path.startsWith("/events/")) {
    const event = previewEvents.find(
      (item) => item.slug === decodeURIComponent(path.slice(8)),
    );
    if (event) return event;
    throw new Error("This sample event does not exist.");
  }
  throw new Error(
    "This feature needs the PHP backend and is unavailable in the static preview.",
  );
}
