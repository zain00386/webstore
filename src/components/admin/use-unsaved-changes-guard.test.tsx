import { useRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useUnsavedChangesGuard } from "./use-unsaved-changes-guard";

function Page({ dirty }: { dirty: boolean }) {
  const ref = useRef<HTMLFormElement>(null);
  useUnsavedChangesGuard(dirty, ref);
  return (
    <>
      <a href="/admin/books" onClick={(e) => e.preventDefault()}>
        All books
      </a>
      <form ref={ref} onSubmit={(e) => e.preventDefault()}>
        <button>Save</button>
      </form>
      <form role="search" onSubmit={(e) => e.preventDefault()}>
        <button>Search</button>
      </form>
    </>
  );
}

describe("useUnsavedChangesGuard", () => {
  afterEach(() => vi.restoreAllMocks());

  it("asks before links and other forms, never for its own form, and only while dirty", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const { rerender } = render(<Page dirty />);

    expect(fireEvent.click(screen.getByText("All books"))).toBe(false);
    fireEvent.click(screen.getByText("Search"));
    expect(confirm).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByText("Save"));
    expect(confirm).toHaveBeenCalledTimes(2);

    rerender(<Page dirty={false} />);
    fireEvent.click(screen.getByText("All books"));
    expect(confirm).toHaveBeenCalledTimes(2);
  });
});
