export const IS_FREQUENCY_DEMO_MODE = process.env.NEXT_PUBLIC_FREQUENCY_DEMO_MODE === "true";

export const FREQUENCY_DEMO_ROOM_ID = "fp-capstone-demo";
export const FREQUENCY_DEMO_ROOM_NAME = "FP Capstone";
export const FREQUENCY_DEMO_ROOM_DESCRIPTION =
  "A shared classroom room for today’s live Frequency demo.";
export const FREQUENCY_DEMO_ROOM_ACTIVITY_SUMMARY =
  "Live classroom room. Add songs together and watch the timeline evolve.";

export function getFrequencyDemoRoomPath(roomId: string) {
  return `/rooms/${roomId}`;
}
