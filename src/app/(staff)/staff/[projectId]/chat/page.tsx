import { ChatRoom } from "@/components/chat-room";
import { getStaffContext } from "@/lib/data/staff-context";
import type { Message } from "@/lib/types";

export default async function StaffChatPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { supabase, profile } = await getStaffContext();

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true })
    .limit(200);

  return (
    <ChatRoom
      projectId={projectId}
      profileId={profile.id}
      role={profile.role}
      myDisplayName={profile.display_name}
      initialMessages={(messages ?? []) as Message[]}
    />
  );
}
