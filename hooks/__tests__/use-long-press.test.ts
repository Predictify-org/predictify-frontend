import { renderHook, act } from "@testing-library/react";
import { useLongPress } from "@/hooks/use-long-press";

describe("useLongPress", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("calls onLongPress after the delay", () => {
    const onLongPress = jest.fn();
    const { result } = renderHook(() =>
      useLongPress({ onLongPress, delay: 600 })
    );

    act(() => {
      result.current.onMouseDown({
        clientX: 0,
        clientY: 0,
      } as React.MouseEvent);
    });

    act(() => {
      jest.advanceTimersByTime(600);
    });

    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it("does not call onLongPress if released before delay", () => {
    const onLongPress = jest.fn();
    const onClick = jest.fn();
    const { result } = renderHook(() =>
      useLongPress({ onLongPress, onClick, delay: 600 })
    );

    act(() => {
      result.current.onMouseDown({
        clientX: 0,
        clientY: 0,
      } as React.MouseEvent);
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    act(() => {
      result.current.onMouseUp();
    });

    expect(onLongPress).not.toHaveBeenCalled();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("cancels on mouse leave", () => {
    const onLongPress = jest.fn();
    const { result } = renderHook(() =>
      useLongPress({ onLongPress, delay: 600 })
    );

    act(() => {
      result.current.onMouseDown({
        clientX: 0,
        clientY: 0,
      } as React.MouseEvent);
    });

    act(() => {
      result.current.onMouseLeave();
    });

    act(() => {
      jest.advanceTimersByTime(600);
    });

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("cancels on mouse move beyond threshold", () => {
    const onLongPress = jest.fn();
    const { result } = renderHook(() =>
      useLongPress({ onLongPress, delay: 600, moveThreshold: 10 })
    );

    act(() => {
      result.current.onMouseDown({
        clientX: 0,
        clientY: 0,
      } as React.MouseEvent);
    });

    act(() => {
      result.current.onMouseMove({
        clientX: 15,
        clientY: 0,
      } as React.MouseEvent);
    });

    act(() => {
      jest.advanceTimersByTime(600);
    });

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("cancels on touch move beyond threshold", () => {
    const onLongPress = jest.fn();
    const { result } = renderHook(() =>
      useLongPress({ onLongPress, delay: 600, moveThreshold: 10 })
    );

    act(() => {
      result.current.onTouchStart({
        touches: [{ clientX: 0, clientY: 0 }],
      } as unknown as React.TouchEvent);
    });

    act(() => {
      result.current.onTouchMove({
        touches: [{ clientX: 15, clientY: 0 }],
      } as unknown as React.TouchEvent);
    });

    act(() => {
      jest.advanceTimersByTime(600);
    });

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("triggers onLongPress on Enter key", () => {
    const onLongPress = jest.fn();
    const { result } = renderHook(() =>
      useLongPress({ onLongPress })
    );

    act(() => {
      result.current.onKeyDown({
        key: "Enter",
        preventDefault: jest.fn(),
      } as unknown as React.KeyboardEvent);
    });

    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it("triggers onLongPress on Space key", () => {
    const onLongPress = jest.fn();
    const { result } = renderHook(() =>
      useLongPress({ onLongPress })
    );

    act(() => {
      result.current.onKeyDown({
        key: " ",
        preventDefault: jest.fn(),
      } as unknown as React.KeyboardEvent);
    });

    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it("returns correct accessibility attributes", () => {
    const onLongPress = jest.fn();
    const { result } = renderHook(() =>
      useLongPress({ onLongPress })
    );

    expect(result.current.tabIndex).toBe(0);
    expect(result.current.role).toBe("button");
  });

  it("cleans up timer on unmount", () => {
    const onLongPress = jest.fn();
    const { result, unmount } = renderHook(() =>
      useLongPress({ onLongPress, delay: 600 })
    );

    act(() => {
      result.current.onMouseDown({
        clientX: 0,
        clientY: 0,
      } as React.MouseEvent);
    });

    // Unmount before the timer fires
    unmount();

    act(() => {
      jest.advanceTimersByTime(600);
    });

    expect(onLongPress).not.toHaveBeenCalled();
  });
});
