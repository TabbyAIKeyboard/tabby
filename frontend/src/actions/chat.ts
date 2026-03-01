"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { Conversation, Message } from "@/lib/ai/types";
import { UIMessage } from "ai";
import { myProvider } from "@/lib/ai";
import { generateText } from "ai";
import { getTitleGenerationModel } from "@/lib/ai/provider";

export async function getConversations(): Promise<Conversation[]> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching conversations:", error);
    return [];
  }
  return data as Conversation[];
}

export async function getInterviewConversations(): Promise<Conversation[]> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("type", "interview")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching interview conversations:", error);
    return [];
  }
  
  return data as Conversation[];
}

export async function getPrepConversations(): Promise<Conversation[]> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("type", "prep")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching prep conversations:", error);
    return [];
  }
  
  return data as Conversation[];
}

export async function getConversationMessages(
  conversationId: string
): Promise<UIMessage[]> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching messages:", error);
    return [];
  }

  return (data || []).map((msg: Message) => ({
    id: msg.id,
    role: msg.role as "user" | "assistant",
    parts: msg.parts as UIMessage["parts"],
    createdAt: new Date(msg.created_at),
    metadata: msg.metadata || {},
  }));
}

export async function getChatById(
  conversationId: string
): Promise<Conversation | null> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("Error fetching conversation:", error);
    return null;
  }
  return data as Conversation;
}

export async function saveChat({
  id,
  title,
  type = "chat",
  userId,
}: {
  id: string;
  title: string;
  type?: string;
  userId?: string;
}): Promise<Conversation | null> {
  const supabase = await createSupabaseServer();
  const payload: any = { id, title, type };
  if (userId) {
    payload.user_id = userId;
  }
  
  const { data, error } = await supabase
    .from("conversations")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("Error creating conversation:", error);
    return null;
  }
  return data as Conversation;
}

export async function saveMessages(
  messages: UIMessage[],
  conversationId: string
): Promise<void> {
  const supabase = await createSupabaseServer();

  const messagesToInsert = messages.map((msg) => ({
    id: msg.id,
    conversation_id: conversationId,
    role: msg.role,
    parts: msg.parts,
    metadata: (msg as any).metadata || null,
  }));

  const { error } = await supabase.from("messages").upsert(messagesToInsert, {
    onConflict: "id",
  });

  if (error) {
    console.error("Error saving messages:", error);
  }

  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);
}

export async function deleteConversation(conversationId: string): Promise<void> {
  const supabase = await createSupabaseServer();
  const { error } = await supabase
    .from("conversations")
    .delete()
    .eq("id", conversationId);

  if (error) {
    console.error("Error deleting conversation:", error);
    throw error;
  }
}

export async function generateTitleFromUserMessage(
  message: UIMessage,
  model: string
): Promise<string> {
  try {
    const textPart = message.parts?.find((p) => p.type === "text");
    const text = textPart?.type === "text" ? textPart.text : "";

    if (!text) return "New Chat";

    const { text: title } = await generateText({
      model: myProvider.languageModel(getTitleGenerationModel(model)),
      system: `Generate a very short title (max 5 words) for this chat based on the user's first message. 
               Return ONLY the title, no quotes or punctuation.`,
      prompt: text.slice(0, 500),
    });

    return title.trim() || "New Chat";
  } catch (error) {
    console.error("Error generating title:", error);
    return "New Chat";
  }
}
