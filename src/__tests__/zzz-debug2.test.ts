import { describe, it } from "vitest";
import React from "react";
import { screen, fireEvent, render } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useNavigate } from "react-router-dom";

function A() {
  const navigate = useNavigate();
  return React.createElement("button", { onClick: () => navigate("/b") }, "go");
}
function B() {
  return React.createElement("div", null, "arrived");
}

describe("debug2", () => {
  it("navigates with plain router", () => {
    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/a"] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, { path: "/a", element: React.createElement(A) }),
          React.createElement(Route, { path: "/b", element: React.createElement(B) }),
        ),
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "go" }));
    screen.debug();
  });
});
