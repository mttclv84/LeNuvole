import { ChatRoom } from "@/components/chat-room";
import { getClientContext } from "@/lib/data/client-context";
import type { Message } from "@/lib/types";

export default async function ChatPage() {
  const { supabase, profile, project } = await getClientContext();

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("project_id", project.id)
    .order("created_at", { ascending: true })
    .limit(200);

  return (
    <ChatRoom
      projectId={project.id}
      profileId={profile.id}
      role="client"
      myDisplayName={profile.display_name}
      initialMessages={(messages ?? []) as Message[]}
    />
  );
}
