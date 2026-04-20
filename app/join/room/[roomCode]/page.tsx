import { RoomInviteScreen } from "@/components/frequency/room-invite-screen";

export default async function JoinRoomPage(props: PageProps<"/join/room/[roomCode]">) {
  const { roomCode } = await props.params;

  return <RoomInviteScreen roomCode={roomCode} />;
}
