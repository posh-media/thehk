type ToastListener = (message: string) => void;

let listener: ToastListener | null = null;

export function setToastListener(fn: ToastListener | null) {
  listener = fn;
}

export function showToast(message: string) {
  listener?.(message);
}
