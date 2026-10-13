import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PassCard from "../components/PassCard";
import { Confirmation } from "../components/UI";

const event = {
  title: "The Two-Seat Lab",
  category: "Workshop",
  status: "published",
  startAt: "2030-01-01T09:00:00Z",
  venue: "Demo Studio",
};
const registration = {
  passId: "CF-TEST-PASS",
  status: "CONFIRMED",
  teamName: "",
  leaderId: "M1",
  members: [
    { id: "M1", name: "Asha Demo", studentId: "DEMO-A001", attendance: null },
  ],
};

describe("printable pass content", () => {
  it("contains admission essentials without leaking a supplied management secret", () => {
    const secret = "PRIVATE-CODE-MUST-NOT-BE-PRINTED";
    const { container } = render(
      <PassCard
        registration={{
          ...registration,
          managementCode: secret,
          managementCodeHash: "HASH-MUST-NOT-BE-PRINTED",
        }}
        event={event}
        managementCode={secret}
      />,
    );
    expect(screen.getByText("CF-TEST-PASS")).toBeTruthy();
    expect(screen.getByText("The Two-Seat Lab")).toBeTruthy();
    expect(screen.getByText("Demo Studio")).toBeTruthy();
    expect(screen.getAllByText("Asha Demo").length).toBeGreaterThan(0);
    expect(container.textContent).not.toContain(secret);
    expect(container.innerHTML).not.toContain("HASH-MUST-NOT-BE-PRINTED");
    expect(container.querySelector(".printable-pass")).not.toBeNull();
  });

  it("prominently labels a waitlisted receipt as no admission and shows queue position", () => {
    const { container } = render(
      <PassCard
        registration={{
          ...registration,
          status: "WAITLISTED",
          waitlistPosition: 3,
        }}
        event={event}
      />,
    );
    expect(screen.getByText("NOT A CONFIRMED ADMISSION PASS")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(container.textContent).not.toContain("Bring this confirmed pass");
  });

  it("shows event cancellation and its reason without inviting admission", () => {
    const { container } = render(
      <PassCard
        registration={{
          ...registration,
          status: "CANCELLED",
          cancellationReason: "Event cancelled: Venue unavailable",
        }}
        event={{ ...event, status: "cancelled" }}
      />,
    );
    expect(screen.getByText("Event cancelled")).toBeTruthy();
    expect(screen.getByText("Event cancelled: Venue unavailable")).toBeTruthy();
    expect(container.textContent).toContain("does not permit entry");
    expect(container.textContent).not.toContain("Bring this confirmed pass");
  });

  it("renders participant input as text, not executable markup", () => {
    const name = "<img src=x onerror=alert(1)>";
    const { container } = render(
      <PassCard
        registration={{
          ...registration,
          members: [{ ...registration.members[0], name }],
        }}
        event={event}
      />,
    );
    expect(container.textContent).toContain(name);
    expect(container.querySelector("img")).toBeNull();
  });
});

describe("confirmation recovery controls", () => {
  it("keeps cancellation usable when verification has disabled only confirm", async () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <Confirmation
        title="Issue a new private code?"
        label="Issue new code"
        confirmDisabled
        onCancel={onCancel}
        onConfirm={onConfirm}
        busy={false}
      >
        Verify in person first.
      </Confirmation>,
    );
    expect(
      screen.getByRole("button", { name: "Issue new code" }).disabled,
    ).toBe(true);
    expect(screen.getByRole("button", { name: "Keep it" }).disabled).toBe(
      false,
    );
    await user.click(screen.getByRole("button", { name: "Keep it" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("allows native Escape cancellation while confirm is disabled", () => {
    const onCancel = vi.fn();
    render(
      <Confirmation
        title="Verification"
        confirmDisabled
        onCancel={onCancel}
        onConfirm={vi.fn()}
        busy={false}
      >
        Verify first.
      </Confirmation>,
    );
    fireEvent(
      screen.getByRole("dialog"),
      new Event("cancel", { bubbles: true, cancelable: true }),
    );
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("prevents repeated confirmation and cancellation during an actual request", async () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <Confirmation
        title="Saving registration"
        busy
        onCancel={onCancel}
        onConfirm={onConfirm}
      >
        Please wait.
      </Confirmation>,
    );
    expect(screen.getByRole("button", { name: "Saving…" }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Keep it" }).disabled).toBe(true);
    await user.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(onCancel).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
