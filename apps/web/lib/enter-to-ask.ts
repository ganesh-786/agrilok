// When a key press in the question box should send the question.
//
// Enter asks and Shift + Enter starts a new line, as in most chat apps. Two
// exceptions keep a half-written question from being sent by accident, which
// would also spend a live model call:
//
// - While an input method is composing, Enter confirms the word being typed.
//   Nepali is often typed through one (romanised "krishi" becoming कृषि), and
//   Chrome and Safari report such key presses with keyCode 229.
// - On a touch screen, Enter is the only way to start a new line: a phone
//   keyboard has no Shift + Enter. There the Ask button sends the question.
//
// Ctrl + Enter or Cmd + Enter asks everywhere, for a tablet with a keyboard.

export type EnterKey = {
  key: string;
  shiftKey: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  isComposing: boolean;
  keyCode: number;
};

const IME_PROCESS_KEY = 229;

export function isAskKey(event: EnterKey, touchScreen: boolean): boolean {
  if (event.key !== "Enter" || event.isComposing || event.keyCode === IME_PROCESS_KEY) {
    return false;
  }
  if (event.ctrlKey || event.metaKey) return true;
  if (event.shiftKey || event.altKey) return false;
  return !touchScreen;
}
