let pomodoroWindow: Window | null = null;

export interface DocumentPictureInPicture {
  window: Window | null;
  requestWindow: (options?: { width?: number; height?: number }) => Promise<Window>;
}

export function getDocumentPictureInPicture() {
  if (typeof window === "undefined") return null;
  return (window as Window & { documentPictureInPicture?: DocumentPictureInPicture }).documentPictureInPicture ?? null;
}

export function supportsDocumentPictureInPicture() {
  return getDocumentPictureInPicture() !== null;
}

export function openPomodoroWindow() {
  if (typeof window === "undefined") return null;
  if (pomodoroWindow && !pomodoroWindow.closed) {
    pomodoroWindow.focus();
    return pomodoroWindow;
  }

  pomodoroWindow = window.open(
    "/pomodoro-window",
    "nisky-pomodoro",
    "popup=yes,width=480,height=300,resizable=yes,scrollbars=no",
  );
  pomodoroWindow?.focus();
  return pomodoroWindow;
}
