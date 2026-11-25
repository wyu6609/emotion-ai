import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import App from "./App";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("starts idle, requests video only on click, and reports denied permission", async () => {
  const getUserMedia = vi.fn().mockRejectedValue(new DOMException("", "NotAllowedError"));
  vi.stubGlobal("navigator", Object.assign(Object.create(navigator), { mediaDevices: { getUserMedia } }));
  render(<App />);
  expect(screen.getByRole("heading", { name: "Expression Lab" })).toBeTruthy();
  expect(screen.getByText("Awaiting a face")).toBeTruthy();
  expect(getUserMedia).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Start camera" }));
  expect(await screen.findByText(/Camera permission denied/)).toBeTruthy();
  expect(getUserMedia).toHaveBeenCalledWith(expect.objectContaining({ audio: false }));
});
