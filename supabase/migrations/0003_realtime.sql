-- Abilita gli eventi realtime sulla tabella messages (chat), necessari al
-- componente ChatRoom (src/components/chat-room.tsx) per ricevere i nuovi
-- messaggi senza refresh.
alter publication supabase_realtime add table public.messages;
