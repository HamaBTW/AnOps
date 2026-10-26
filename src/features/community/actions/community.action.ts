"use server";

import { revalidatePath } from "next/cache";
import { requireActiveTenant } from "@/server/tenant/context";
import { getCurrentAuthUser } from "@/server/auth/rbac";
import { parseWithSchema } from "@/shared/lib/validation";
import {
  createBlogPostSchema,
  updateBlogPostSchema,
  createForumTopicSchema,
  createForumReplySchema,
  createCommentSchema,
  startChatSchema,
  sendChatMessageSchema,
  generateAiSummarySchema,
} from "@/features/community/schemas/community.schema";
import {
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  getBlogPostByIdOrSlug,
  createForumTopic,
  togglePinTopic,
  createForumReply,
  createComment,
  deleteComment,
  startChatConversation,
  sendChatMessage,
  closeChatConversation,
  getChatConversationById,
  getChatMessages,
  saveAISummary,
  saveAIReplySuggestion,
  getBlogPosts,
} from "@/server/services/community.service";
import {
  summarizeBlogArticle,
  CommunitySupportAgent,
  generateSupportReplySuggestions,
} from "@/features/community/ai/community-ai.agent";
import type { AgentMessage } from "@/server/ai/base-agent";

export type ActionResult<T = unknown> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

// ============================================================================
// BLOG POST ACTIONS
// ============================================================================

export async function createBlogPostAction(rawInput: unknown): Promise<ActionResult> {
  try {
    const tenant = await requireActiveTenant();
    const authUser = await getCurrentAuthUser();
    const authorName = authUser?.employee?.fullName || authUser?.email || "Editor";
    const authorId = authUser?.userId || "user";

    const parsed = parseWithSchema(createBlogPostSchema, rawInput);
    if (!parsed.success) {
      return { success: false, error: parsed.message, fieldErrors: parsed.errors };
    }

    const post = await createBlogPost(tenant.companyId, parsed.data, {
      id: authorId,
      name: authorName,
    });

    revalidatePath("/community");
    return { success: true, data: post, message: "Article created successfully" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create blog post",
    };
  }
}

export async function updateBlogPostAction(rawInput: unknown): Promise<ActionResult> {
  try {
    const tenant = await requireActiveTenant();
    const parsed = parseWithSchema(updateBlogPostSchema, rawInput);
    if (!parsed.success) {
      return { success: false, error: parsed.message, fieldErrors: parsed.errors };
    }

    const updated = await updateBlogPost(tenant.companyId, parsed.data);
    if (!updated) {
      return { success: false, error: "Article not found or update failed" };
    }

    revalidatePath("/community");
    return { success: true, data: updated, message: "Article updated successfully" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update blog post",
    };
  }
}

export async function publishBlogPostAction(postId: string): Promise<ActionResult> {
  try {
    const tenant = await requireActiveTenant();
    const updated = await updateBlogPost(tenant.companyId, {
      id: postId,
      status: "published",
    });

    if (!updated) {
      return { success: false, error: "Article not found" };
    }

    revalidatePath("/community");
    return { success: true, data: updated, message: "Article published successfully" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to publish article",
    };
  }
}

export async function deleteBlogPostAction(postId: string): Promise<ActionResult> {
  try {
    const tenant = await requireActiveTenant();
    const deleted = await deleteBlogPost(tenant.companyId, postId);
    if (!deleted) {
      return { success: false, error: "Article could not be deleted" };
    }

    revalidatePath("/community");
    return { success: true, data: { id: postId }, message: "Article deleted" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete article",
    };
  }
}

// ============================================================================
// FORUM ACTIONS
// ============================================================================

export async function createForumTopicAction(rawInput: unknown): Promise<ActionResult> {
  try {
    const tenant = await requireActiveTenant();
    const authUser = await getCurrentAuthUser();
    const authorName = authUser?.employee?.fullName || authUser?.email || "Member";
    const authorId = authUser?.userId || "user";

    const parsed = parseWithSchema(createForumTopicSchema, rawInput);
    if (!parsed.success) {
      return { success: false, error: parsed.message, fieldErrors: parsed.errors };
    }

    const topic = await createForumTopic(tenant.companyId, parsed.data, {
      id: authorId,
      name: authorName,
    });

    revalidatePath("/community");
    return { success: true, data: topic, message: "Discussion topic started" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create forum topic",
    };
  }
}

export async function togglePinTopicAction(topicId: string): Promise<ActionResult> {
  try {
    const tenant = await requireActiveTenant();
    const isPinned = await togglePinTopic(tenant.companyId, topicId);

    revalidatePath("/community");
    return {
      success: true,
      data: { isPinned },
      message: isPinned ? "Topic pinned to top" : "Topic unpinned",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to toggle pin",
    };
  }
}

export async function createForumReplyAction(rawInput: unknown): Promise<ActionResult> {
  try {
    const tenant = await requireActiveTenant();
    const authUser = await getCurrentAuthUser();
    const authorName = authUser?.employee?.fullName || authUser?.email || "Member";
    const authorId = authUser?.userId || "user";

    const parsed = parseWithSchema(createForumReplySchema, rawInput);
    if (!parsed.success) {
      return { success: false, error: parsed.message, fieldErrors: parsed.errors };
    }

    const reply = await createForumReply(tenant.companyId, parsed.data, {
      id: authorId,
      name: authorName,
    });

    revalidatePath("/community");
    return { success: true, data: reply, message: "Reply posted" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to post reply",
    };
  }
}

// ============================================================================
// COMMENTS ENGINE ACTIONS
// ============================================================================

export async function createCommentAction(rawInput: unknown): Promise<ActionResult> {
  try {
    const tenant = await requireActiveTenant();
    const authUser = await getCurrentAuthUser();
    const authorName = authUser?.employee?.fullName || authUser?.email || "User";
    const authorId = authUser?.userId || "user";

    const parsed = parseWithSchema(createCommentSchema, rawInput);
    if (!parsed.success) {
      return { success: false, error: parsed.message, fieldErrors: parsed.errors };
    }

    const comment = await createComment(tenant.companyId, parsed.data, {
      id: authorId,
      name: authorName,
    });

    revalidatePath("/community");
    return { success: true, data: comment, message: "Comment posted" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to post comment",
    };
  }
}

export async function deleteCommentAction(commentId: string): Promise<ActionResult> {
  try {
    const tenant = await requireActiveTenant();
    const deleted = await deleteComment(tenant.companyId, commentId);
    if (!deleted) {
      return { success: false, error: "Comment could not be deleted" };
    }

    revalidatePath("/community");
    return { success: true, data: { id: commentId }, message: "Comment deleted" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete comment",
    };
  }
}

// ============================================================================
// LIVE SUPPORT CHAT ACTIONS
// ============================================================================

export async function startChatConversationAction(rawInput: unknown): Promise<ActionResult> {
  try {
    const tenant = await requireActiveTenant();
    const authUser = await getCurrentAuthUser();

    const parsed = parseWithSchema(startChatSchema, rawInput);
    if (!parsed.success) {
      return { success: false, error: parsed.message, fieldErrors: parsed.errors };
    }

    const result = await startChatConversation(
      tenant.companyId,
      parsed.data,
      authUser?.userId
    );

    revalidatePath("/community");
    return { success: true, data: result, message: "Support conversation started" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to start conversation",
    };
  }
}

export async function sendChatMessageAction(rawInput: unknown): Promise<ActionResult> {
  try {
    const tenant = await requireActiveTenant();
    const authUser = await getCurrentAuthUser();
    const senderName = authUser?.employee?.fullName || authUser?.email || "Support Agent";

    const parsed = parseWithSchema(sendChatMessageSchema, rawInput);
    if (!parsed.success) {
      return { success: false, error: parsed.message, fieldErrors: parsed.errors };
    }

    const message = await sendChatMessage(tenant.companyId, parsed.data, {
      id: authUser?.userId,
      name: senderName,
    });

    revalidatePath("/community");
    return { success: true, data: message };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send message",
    };
  }
}

export async function closeChatConversationAction(conversationId: string): Promise<ActionResult> {
  try {
    const tenant = await requireActiveTenant();
    const closed = await closeChatConversation(tenant.companyId, conversationId);
    if (!closed) {
      return { success: false, error: "Conversation not found or already closed" };
    }

    revalidatePath("/community");
    return { success: true, data: { id: conversationId }, message: "Conversation marked as closed" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to close conversation",
    };
  }
}

/**
 * Triggers automated AI chatbot response for a conversation when human agents are offline.
 * Fulfills AnOps.md requirement: "Fallback AI chatbot for live chat when human operators are offline."
 */
export async function triggerAiBotReplyAction(conversationId: string): Promise<ActionResult> {
  try {
    const tenant = await requireActiveTenant();
    const conversation = await getChatConversationById(tenant.companyId, conversationId);
    if (!conversation) {
      return { success: false, error: "Conversation not found" };
    }

    const messages = await getChatMessages(tenant.companyId, conversationId);
    const lastUserMessage = [...messages].reverse().find((m) => m.senderType === "visitor")?.body || "Hello, I need assistance.";

    // Load knowledge articles for context
    const articles = await getBlogPosts(tenant.companyId, { status: "published" });

    const agent = new CommunitySupportAgent();
    const history: AgentMessage[] = messages.map((m) => ({
      id: m.id,
      role: m.senderType === "visitor" ? "user" : "assistant",
      content: m.body,
      timestamp: m.sentAt,
    }));

    const response = await agent.chat(history, lastUserMessage, {
      companyName: tenant.company.name,
      visitorName: conversation.visitorName,
      recentArticles: articles.map((a) => ({ title: a.title, excerpt: a.excerpt })),
    });

    // Save AI response as chat message
    const botMsg = await sendChatMessage(
      tenant.companyId,
      {
        conversationId,
        body: response.message.content,
        senderType: "bot",
        messageType: "faq_answer",
      },
      { name: "AnOps Support Bot" }
    );

    revalidatePath("/community");
    return { success: true, data: botMsg, message: "AI bot reply sent" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "AI bot reply generation failed",
    };
  }
}

/**
 * Generates AI suggestions for human agents to reply with one click.
 */
export async function getAiReplySuggestionsAction(conversationId: string): Promise<ActionResult<string[]>> {
  try {
    const tenant = await requireActiveTenant();
    const messages = await getChatMessages(tenant.companyId, conversationId);
    const lastVisitorMsg = [...messages].reverse().find((m) => m.senderType === "visitor")?.body || "Hello";

    const suggestions = await generateSupportReplySuggestions(lastVisitorMsg);

    // Save for audit/record
    if (suggestions[0]) {
      await saveAIReplySuggestion(tenant.companyId, {
        conversationId,
        suggestedText: suggestions[0],
      });
    }

    return { success: true, data: suggestions };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not fetch suggestions",
    };
  }
}

// ============================================================================
// AI SUMMARY ACTIONS
// ============================================================================

export async function generateBlogPostSummaryAction(rawInput: unknown): Promise<ActionResult> {
  try {
    const tenant = await requireActiveTenant();
    const authUser = await getCurrentAuthUser();
    const requester = authUser?.employee?.fullName || authUser?.email || "Editor";

    const parsed = parseWithSchema(generateAiSummarySchema, rawInput);
    if (!parsed.success) {
      return { success: false, error: parsed.message, fieldErrors: parsed.errors };
    }

    const post = await getBlogPostByIdOrSlug(tenant.companyId, parsed.data.blogPostId);
    if (!post) {
      return { success: false, error: "Article not found" };
    }

    const summaryData = await summarizeBlogArticle(post.title, post.body);

    const savedSummary = await saveAISummary(tenant.companyId, {
      blogPostId: post.id,
      requestedBy: requester,
      summary: summaryData.summary,
      bulletPoints: summaryData.bulletPoints,
      modelVersion: summaryData.modelVersion,
    });

    revalidatePath("/community");
    return {
      success: true,
      data: savedSummary,
      message: "3-bullet AI summary generated successfully",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate AI summary",
    };
  }
}
