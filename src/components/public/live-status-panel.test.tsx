import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LiveStatusPanel } from "./live-status-panel";

afterEach(() => {
  vi.useRealTimers();
});

describe("LiveStatusPanel", () => {
  it("renders scheduled state with a countdown and contextual CTA", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T20:41:18.000Z"));

    render(
      <LiveStatusPanel
        initialState="scheduled"
        startsAtIso="2026-06-16T01:00:00.000Z"
        initialCountdown={{ days: 0, hours: 4, minutes: 18, seconds: 42 }}
      />,
    );

    expect(screen.getByText("Live agendada")).toBeInTheDocument();
    expect(screen.getByText("04")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Ver produtos da live/ }),
    ).toHaveAttribute("href", "#produtos");
    expect(
      screen.getByText("A live começa em 4 horas, 18 minutos."),
    ).toBeInTheDocument();
  });

  it("switches to live when the countdown reaches zero", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T22:59:59.000Z"));

    render(
      <LiveStatusPanel
        initialState="scheduled"
        startsAtIso="2026-06-15T23:00:00.000Z"
        initialCountdown={{ days: 0, hours: 0, minutes: 0, seconds: 1 }}
      />,
    );

    expect(screen.getByText("Live agendada")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText("Ao vivo agora")).toBeInTheDocument();
    expect(screen.queryByText("A live começa em")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Ver produtos agora/ }),
    ).toBeInTheDocument();
  });

  it("renders finished state without starting an interval", () => {
    vi.useFakeTimers();
    const setIntervalSpy = vi.spyOn(window, "setInterval");

    render(
      <LiveStatusPanel
        initialState="finished"
        startsAtIso="2026-06-15T23:00:00.000Z"
        initialCountdown={{ days: 0, hours: 0, minutes: 0, seconds: 0 }}
      />,
    );

    expect(screen.getByText("Produtos da live")).toBeInTheDocument();
    expect(setIntervalSpy).not.toHaveBeenCalled();
  });
});
