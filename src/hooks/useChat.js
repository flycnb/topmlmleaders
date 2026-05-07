import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/** Conversations.member1_id / member2_id are two auth.users ids (lexicographically sorted). */
function sortedAuthPair(a, b) {
  const x = String(a);
  const y = String(b);
  return x < y ? [x, y] : [y, x];
}

export function useChat(user, member) {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [peerMissing, setPeerMissing] = useState(false);

  const userId = user?.id;
  const memberProfileId = member?.id;
  const peerAuthId = member?.ownerId || null;

  useEffect(() => {
    if (!userId || !memberProfileId) {
      setConversationId(null);
      setMessages([]);
      setPeerMissing(false);
      return;
    }
    if (!peerAuthId) {
      setConversationId(null);
      setMessages([]);
      setPeerMissing(true);
      setLoading(false);
      return;
    }
    if (String(peerAuthId) === String(userId)) {
      setConversationId(null);
      setMessages([]);
      setPeerMissing(false);
      setLoading(false);
      return;
    }

    let active = true;
    setPeerMissing(false);

    const boot = async () => {
      setLoading(true);
      const [low, high] = sortedAuthPair(userId, peerAuthId);

      let { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("member1_id", low)
        .eq("member2_id", high)
        .maybeSingle();

      let id = existing?.id;
      if (!id) {
        const { data: created, error: insErr } = await supabase
          .from("conversations")
          .insert({
            member1_id: low,
            member2_id: high,
            unread_count_m1: 0,
            unread_count_m2: 0,
          })
          .select("id")
          .single();

        if (insErr?.code === "23505") {
          const { data: again } = await supabase
            .from("conversations")
            .select("id")
            .eq("member1_id", low)
            .eq("member2_id", high)
            .maybeSingle();
          id = again?.id ?? null;
        } else {
          id = created?.id ?? null;
        }
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
  }, [userId, memberProfileId, peerAuthId]);

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
  };

  return { messages, loading, sendMessage, peerMissing };
}
