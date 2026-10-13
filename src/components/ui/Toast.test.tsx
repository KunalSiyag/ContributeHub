// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider, useToast } from './Toast';

type Api = ReturnType<typeof useToast>;

function Capture({ onReady }: { onReady: (api: Api) => void }) {
  const api = useToast();
  useEffect(() => {
    onReady(api);
  }, [api, onReady]);
  return null;
}

function setup() {
  let api: Api | undefined;
  render(
    <ToastProvider>
      <Capture
        onReady={value => {
          api = value;
        }}
      />
    </ToastProvider>
  );
  return (...args: Parameters<Api['toast']>) => act(() => api!.toast(...args));
}

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const toastOf = (text: string) => screen.getByText(text).parentElement!;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('ToastProvider', () => {
  it('dismisses a plain toast after 3.5s', () => {
    const toast = setup();
    toast('Saved');
    advance(3499);
    expect(screen.queryByText('Saved')).not.toBeNull();
    advance(1);
    expect(screen.queryByText('Saved')).toBeNull();
  });

  it('pauses while hovered and resumes with the time that was left', () => {
    const toast = setup();
    toast('Removed', { action: { label: 'Undo', onClick: () => {} } });
    advance(4000);
    fireEvent.pointerEnter(toastOf('Removed'));
    advance(20_000);
    expect(screen.queryByText('Removed')).not.toBeNull();

    fireEvent.pointerLeave(toastOf('Removed'));
    advance(1999);
    expect(screen.queryByText('Removed')).not.toBeNull();
    advance(1);
    expect(screen.queryByText('Removed')).toBeNull();
  });

  it('keeps a short grace period when the pointer leaves near the end', () => {
    const toast = setup();
    toast('Saved');
    advance(3400);
    fireEvent.pointerEnter(toastOf('Saved'));
    fireEvent.pointerLeave(toastOf('Saved'));
    advance(1499);
    expect(screen.queryByText('Saved')).not.toBeNull();
    advance(1);
    expect(screen.queryByText('Saved')).toBeNull();
  });

  it('runs the action, removes the toast and lets the others time out', () => {
    const toast = setup();
    const undo = vi.fn();
    toast('Other');
    toast('Removed', { action: { label: 'Undo', onClick: undo } });
    fireEvent.pointerEnter(toastOf('Removed'));
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));

    expect(undo).toHaveBeenCalledOnce();
    expect(screen.queryByText('Removed')).toBeNull();
    advance(3500);
    expect(screen.queryByText('Other')).toBeNull();
  });

  it('shows at most three toasts and drops the oldest', () => {
    const toast = setup();
    for (const message of ['One', 'Two', 'Three', 'Four']) toast(message);
    expect(screen.queryByText('One')).toBeNull();
    expect(screen.getByText('Four')).toBeTruthy();
    advance(3500);
    expect(screen.queryByText('Two')).toBeNull();
    expect(screen.queryByText('Four')).toBeNull();
  });
});
