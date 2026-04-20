import { FriendInviteScreen } from "@/components/frequency/friend-invite-screen";

export default async function JoinFriendPage(props: PageProps<"/join/friend/[friendCode]">) {
  const { friendCode } = await props.params;

  return <FriendInviteScreen friendCode={friendCode} />;
}
