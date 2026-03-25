import { RoomDetailScreen } from "@/components/frequency/room-detail-screen";

export default async function RoomDetailPage(props: PageProps<"/rooms/[roomId]">) {
  const { roomId } = await props.params;
  return <RoomDetailScreen roomId={roomId} />;
}
