import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

function sortIds(a, b) {
  return String(a) < String(b) ? [a, b] : [b, a];
}

export function useChat(user, member) {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const peerMissing = !member?.ownerId;

  useEffect(() => {
    let active = true;

    async function setupConversation() {
      if (!user?.id || !member?.ownerId || user.id === member.ownerId) {
        setConversationId(null);
        setMessages([]);
        return;
      }

      setLoading(true);
      const [member1Id, member2Id] = sortIds(user.id, member.ownerId);

      let conversation = null;
      const existing = await supabase
        .from("conversations")
        .select("id, member1_id, member2_id")
        .eq("member1_id", member1Id)
        .eq("member2_id", member2Id)
        .maybeSingle();

      if (existing.data?.id) {
        conversation = existing.data;
      } else {
        const created = await supabase
          .from("conversations")
          .insert({
            member1_id: member1Id,
            member2_id: member2Id,
            created_at: new Date().toISOString(),
          })
          .select("id, member1_id, member2_id")
          .single();
        conversation = created.data || null;
      }

      if (!active || !conversation?.id) {
        if (active) setLoading(false);
        return;
      }

      setConversationId(conversation.id);

      const messageRes = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true });

      if (!active) return;
      setMessages(messageRes.data || []);
      setLoading(false);
    }

    setupConversation();
    return () => {
      active = false;
    };
  }, [user?.id, member?.ownerId]);

  const markAsRead = useCallback(async () => {
    if (!conversationId || !user?.id) return;
    await supabase
      .from("messages")
      .update({ read: true })
      .eq("conversation_id", conversationId)
      .neq("sender_id", user.id)
      .eq("read", false);
  }, [conversationId, user?.id]);

  useEffect(() => {
    if (!conversationId) return undefined;

    markAsRead();

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async () => {
          const messageRes = await supabase
            .from("messages")
            .select("*")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true });
          setMessages(messageRes.data || []);
          markAsRead();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, markAsRead]);

  const sendMessage = useCallback(
    async (text) => {
      const body = String(text || "").trim();
      if (!body || !conversationId || !user?.id || peerMissing) return;

      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        text: body,
        read: false,
        created_at: new Date().toISOString(),
      });

      await supabase
        .from("conversations")
        .update({
          last_message: body,
          last_message_time: new Date().toISOString(),
        })
        .eq("id", conversationId);

      if (member?.ownerId) {
        await supabase.from("notifications").insert({
          user_id: member.ownerId,
          type: "message",
          from_name: user.name || "Member",
          text: `${user.name || "Member"} sent you a message`,
          read: false,
          created_at: new Date().toISOString(),
        });
      }
    },
    [conversationId, user?.id, user?.name, member?.ownerId, peerMissing]
  );

  return useMemo(
    () => ({
      messages,
      sendMessage,
      loading,
      peerMissing,
      markAsRead,
    }),
    [messages, sendMessage, loading, peerMissing, markAsRead]
  );
}

