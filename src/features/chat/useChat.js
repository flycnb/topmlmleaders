import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

function sortIds(a, b) {
  return String(a) < String(b) ? [a, b] : [b, a];
}

export function useChat(user, member) {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [myMemberId, setMyMemberId] = useState(null);
  const [myMemberResolved, setMyMemberResolved] = useState(false);
  const peerMissing = !member?.ownerId;
  /** Logged in but no members row for this auth user — cannot satisfy messages.sender_id → members FK. */
  const senderMissing = Boolean(user?.id) && myMemberResolved && !myMemberId;

  useEffect(() => {
    if (!user?.id) {
      setMyMemberId(null);
      setMyMemberResolved(true);
      return undefined;
    }
    let active = true;
    setMyMemberResolved(false);
    void supabase
      .from("members")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) console.error("[chat] resolve sender member id failed", error);
        setMyMemberId(data?.id ?? null);
        setMyMemberResolved(true);
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    let loadTimeoutId = null;

    async function setupConversation() {
      if (!user?.id || !member?.ownerId || user.id === member.ownerId) {
        setConversationId(null);
        setMessages([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      loadTimeoutId = window.setTimeout(() => {
        if (active) {
          console.warn("[chat] setup exceeded 5s; unlocking UI");
          setLoading(false);
        }
      }, 5000);

      try {
        const [member1Id, member2Id] = sortIds(user.id, member.ownerId);

        let conversation = null;
        const existing = await supabase
          .from("conversations")
          .select("id, member1_id, member2_id")
          .eq("member1_id", member1Id)
          .eq("member2_id", member2Id)
          .maybeSingle();

        if (!active) return;

        if (existing.error) {
          console.error("[chat] conversations select failed", existing.error);
          return;
        }

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

          if (!active) return;

          if (created.error) {
            console.error("[chat] conversations insert failed", created.error);
            return;
          }
          conversation = created.data || null;
        }

        if (!conversation?.id) return;

        setConversationId(conversation.id);

        const messageRes = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversation.id)
          .order("created_at", { ascending: true });

        if (!active) return;

        if (messageRes.error) {
          console.error("[chat] messages select failed", messageRes.error);
          return;
        }

        setMessages(messageRes.data || []);
      } catch (e) {
        if (active) console.error("[chat] setupConversation failed", e);
      } finally {
        if (loadTimeoutId != null) {
          window.clearTimeout(loadTimeoutId);
          loadTimeoutId = null;
        }
        if (active) setLoading(false);
      }
    }

    setupConversation();
    return () => {
      active = false;
      if (loadTimeoutId != null) window.clearTimeout(loadTimeoutId);
    };
  }, [user?.id, member?.ownerId]);

  const markAsRead = useCallback(async () => {
    if (!conversationId || !myMemberId) return;
    await supabase
      .from("messages")
      .update({ read: true })
      .eq("conversation_id", conversationId)
      .neq("sender_id", myMemberId)
      .eq("read", false);
  }, [conversationId, myMemberId]);

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
      if (!body || !conversationId || !user?.id || peerMissing || !myMemberId) return;

      const { data: insertedRow, error: insertError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: myMemberId,
          sender_name: user.name || null,
          message: body,
        })
        .select("*")
        .single();

      if (insertError) {
        console.error("[chat] messages insert failed", insertError);
        return;
      }

      if (insertedRow) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === insertedRow.id)) return prev;
          return [...prev, insertedRow];
        });
      }

      const { error: convError } = await supabase
        .from("conversations")
        .update({
          last_message: body,
          last_message_time: new Date().toISOString(),
        })
        .eq("id", conversationId);

      if (convError) {
        console.error("[chat] conversations update failed", convError);
      }
    },
    [conversationId, user?.id, user?.name, peerMissing, myMemberId]
  );

  return useMemo(
    () => ({
      messages,
      sendMessage,
      loading,
      peerMissing,
      senderMissing,
      myMemberId,
      markAsRead,
    }),
    [messages, sendMessage, loading, peerMissing, senderMissing, myMemberId, markAsRead]
  );
}

