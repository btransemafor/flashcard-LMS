/**
 * Thin wrapper around the File System Access API. Every function here degrades
 * gracefully: callers must always check `isFileSystemAccessSupported()` first and
 * fall back to plain <input type="file"> + download-based export when it's false.
 * Chrome and Edge (Chromium 86+) support this API; Firefox and Safari do not.
 */

export class FileSystemPermissionError extends Error {}
export class FileSystemWriteError extends Error {}

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showOpenFilePicker' in window;
}

const EXCEL_PICKER_OPTIONS: OpenFilePickerOptions = {
  types: [
    {
      description: 'Excel workbook',
      accept: {
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
        'application/vnd.ms-excel': ['.xls']
      }
    }
  ],
  excludeAcceptAllOption: false,
  multiple: false
};

/** Must be called directly from a user gesture (e.g. a button click handler). */
export async function openWorkbookWithPicker(): Promise<{ handle: FileSystemFileHandle; file: File } | null> {
  if (!isFileSystemAccessSupported()) return null;
  try {
    const [handle] = await window.showOpenFilePicker!(EXCEL_PICKER_OPTIONS);
    const file = await handle.getFile();
    return { handle, file };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return null; // user cancelled
    throw new FileSystemPermissionError('Could not open the file picker. Please try again or use Import instead.');
  }
}

/** Checks current permission state without prompting the user. */
export async function hasReadWritePermission(handle: FileSystemFileHandle): Promise<boolean> {
  try {
    const opts: FileSystemHandlePermissionDescriptor = { mode: 'readwrite' };
    const state = await handle.queryPermission(opts);
    return state === 'granted';
  } catch {
    return false;
  }
}

/** Prompts the user for permission. Must be called from within a direct user interaction (e.g. click). */
export async function requestReadWritePermission(handle: FileSystemFileHandle): Promise<boolean> {
  try {
    const opts: FileSystemHandlePermissionDescriptor = { mode: 'readwrite' };
    const state = await handle.requestPermission(opts);
    return state === 'granted';
  } catch {
    return false;
  }
}

/** Writes the given bytes directly into the linked file. Never called without a prior granted permission. */
export async function writeWorkbookToHandle(handle: FileSystemFileHandle, data: ArrayBuffer): Promise<void> {
  try {
    const writable = await handle.createWritable();
    await writable.write(data);
    await writable.close();
  } catch (err) {
    throw new FileSystemWriteError(
      'We could not save directly to your workbook. Your progress is still safe in this browser — try Export Excel instead.'
    );
  }
}

export async function getHandleFileName(handle: FileSystemFileHandle): Promise<string> {
  return handle.name;
}
