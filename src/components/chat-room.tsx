"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Paperclip, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn, formatDateTime } from "@/lib/utils";
import { STAFF_DISPLAY_NAME, type Message, type UserRole } from "@/lib/types";

const BUCKET = "project-files";
const SIGNED_URL_TTL = 60 * 30;

interface ChatRoomProps {
  projectId: string;
  profileId: string;
  role: UserRole;
  myDisplayName: string;
  initialMessages: Message[];
}

export function ChatRoom({ projectId, profileId, role, myDisplayName, initialMessages }: ChatRoomProps) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [attachmentUrls, setAttachmentUrls] = useState<Map<string, string>>(new Map());
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Realtime: nuovi messaggi (staff o cliente) arrivano senza refresh.
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${projectId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `project_id=eq.${projectId}` },
        (payload) => setMessages((prev) => [...prev, payload.new as Message]),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Genera le signed URL per gli allegati non ancora risolti.
  useEffect(() => {
    const missing = messages
      .filter((m) => m.attachment_path && !attachmentUrls.has(m.attachment_path))
      .map((m) => m.attachment_path as string);
    if (missing.length === 0) return;

    supabase.storage
      .from(BUCKET)
      .createSignedUrls(missing, SIGNED_URL_TTL)
      .then(({ data }) => {
        if (!data) return;
        setAttachmentUrls((prev) => {
          const next = new Map(prev);
          data.forEach((d) => {
            if (d.signedUrl && d.path) next.set(d.path, d.signedUrl);
          });
          return next;
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  async function sendMessage(body: string | null, attachmentPath: string | null) {
    await supabase.from("messages").insert({
      project_id: projectId,
      sender_profile_id: profileId,
      sender_role: role,
      body,
      attachment_path: attachmentPath,
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    startTransition(async () => {
      await sendMessage(trimmed, null);
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    startTransition(async () => {
      const path = `${projectId}/chat/${crypto.randomUUID()}-${file.name}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file);
      if (!error) {
        await sendMessage(null, path);
      }
    });
    e.target.value = "";
  }

  return (
    <div className="flex h-[calc(100dvh-9rem)] flex-col rounded-md border border-border bg-card sm:h-[calc(100dvh-7rem)]">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">Nessun messaggio, scrivi il primo.</p>
        )}
        <div className="flex flex-col gap-3">
          {messages.map((m) => {
            const isMine = m.sender_profile_id === profileId;
            const senderLabel = isMine ? myDisplayName : m.sender_role === "client" ? "Cliente" : STAFF_DISPLAY_NAME;
            return (
              <div key={m.id} className={cn("flex flex-col", isMine ? "items-end" : "items-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-md px-3 py-2 text-sm",
                    isMine ? "bg-accent text-accent-foreground" : "bg-muted text-foreground",
                  )}
                >
                  {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}
                  {m.attachment_path && attachmentUrls.get(m.attachment_path) && (
                    <a href={attachmentUrls.get(m.attachment_path)} target="_blank" rel="noreferrer">
                      <Image
                        src={attachmentUrls.get(m.attachment_path)!}
                        alt="Allegato"
                        width={220}
                        height={220}
                        className="mt-1 rounded-md object-cover"
                      />
                    </a>
                  )}
                </div>
                <span className="mt-1 text-[11px] text-muted-foreground">
                  {senderLabel} · {formatDateTime(m.created_at)}
                </span>
              </div>
            );
          })}
        </div>
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-border p-3">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          aria-label="Allega foto"
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Scrivi un messaggio…"
          className="h-10 flex-1 rounded-md border border-border bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
        <button
          type="submit"
          disabled={pending || text.trim().length === 0}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground disabled:opacity-50"
          aria-label="Invia"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
