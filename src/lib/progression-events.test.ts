import {
  notifyUserProgressionUpdate,
  USER_PROGRESSION_UPDATE_EVENT,
} from "./progression-events";

describe("notifyUserProgressionUpdate", () => {
  it("dispatches the user progression update event", () => {
    const dispatchEvent = jest.fn(() => true);

    notifyUserProgressionUpdate({ dispatchEvent });

    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    const event = dispatchEvent.mock.calls[0]?.[0] as Event;
    expect(event.type).toBe(USER_PROGRESSION_UPDATE_EVENT);
  });
});
