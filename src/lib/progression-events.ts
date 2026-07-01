export const USER_PROGRESSION_UPDATE_EVENT = "user-progression-update";

export function notifyUserProgressionUpdate(
  target: Pick<EventTarget, "dispatchEvent"> = window,
) {
  target.dispatchEvent(new Event(USER_PROGRESSION_UPDATE_EVENT));
}
