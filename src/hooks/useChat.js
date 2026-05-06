import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useChat(user, member) {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const userId = user?.id;
  const memberId = member?.id;

  useEffect(() => {
    if (!userId || !memberId) {
      setConversationId(null);
      setMessages([]);
      return;
    }
    let active = true;
    const boot = async () => {
      setLoading(true);
      const filter = `and(member1_id.eq.${userId},member2_id.eq.${memberId}),and(member1_id.eq.${memberId},member2_id.eq.${userId})`;
      let { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .or(filter)
        .limit(1);

      let id = existing?.[0]?.id;
      if (!id) {
        const { data: created } = await supabase
          .from("conversations")
          .insert({
            member1_id: userId,
            member2_id: memberId,
            unread_count_m1: 0,
            unread_count_m2: 0,
          })
          .select("id")
          .single();
        id = created?.id || null;
      }
      if (!active || !id) {
        setLoading(false);
        return;
      }
      setConversationId(id);
      const { data: initial } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });
      if (active) {
        setMessages(initial || []);
        setLoading(false);
      }
    };
    boot();
    return () => {
      active = false;
    };
  }, [userId, memberId]);

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const sendMessage = async (text) => {
    if (!conversationId || !userId || !text.trim()) return;
    const messageText = text.trim();
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: userId,
      sender_name: user?.name || "User",
      sender_initials: (user?.name || "U").slice(0, 2).toUpperCase(),
      sender_color: "#7F77DD",
      text: messageText,
      read: false,
    });
    await supabase
      .from("conversations")
      .update({ last_message: messageText, last_message_time: new Date().toISOString() })
      .eq("id", conversationId);
    const { data: memberRow } = await supabase.from("members").select("email,slug").eq("id", memberId).single();
    const { data: recipient } = await supabase
      .from("users")
      .select("id")
      .eq("email", memberRow?.email || "")
      .single();
    if (recipient?.id) {
      await supabase.from("notifications").insert({
        user_id: recipient.id,
        type: "message",
        from_name: user?.name || "User",
        from_initials: (user?.name || "U").slice(0, 2).toUpperCase(),
        from_color: "#7F77DD",
        text: `${user?.name || "User"} sent you a message`,
        link: `#/m/${memberRow?.slug || ""}`,
      }).catch(() => {});
    }
  };

  return { messages, loading, sendMessage };
}

