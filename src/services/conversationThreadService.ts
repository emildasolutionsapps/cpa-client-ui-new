import { supabase } from "../lib/supabase";

export interface ConversationThreadCount {
  clientId: string;
  count: number;
}

// Simple event emitter for conversation thread badge updates
class ConversationThreadEventEmitter {
  private listeners: ((clientId: string) => void)[] = [];

  subscribe(callback: (clientId: string) => void) {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  emit(clientId: string) {
    this.listeners.forEach((callback) => callback(clientId));
  }
}

export const conversationThreadEventEmitter = new ConversationThreadEventEmitter();

export class ConversationThreadService {
  // Get count of admin messages sent AFTER client's last message
  static async getUnansweredMessageCount(
    clientId: string,
    userId: string,
  ): Promise<number> {
    try {
      console.log(
        `ConversationThreadService: Getting unanswered message count for client ${clientId}`,
      );

      // First get the channel for this client
      const { data: channel, error: channelError } = await supabase
        .from("ChatChannels")
        .select("ChannelID")
        .eq("ClientID", clientId)
        .single();

      if (channelError || !channel) {
        console.log("ConversationThreadService: No channel found for client");
        return 0;
      }

      console.log(
        `ConversationThreadService: Found channel ${channel.ChannelID} for client`,
      );

      // Get client's last message timestamp
      const { data: lastClientMessage, error: lastMessageError } = await supabase
        .from("Messages")
        .select("CreatedAt")
        .eq("ChannelID", channel.ChannelID)
        .eq("SenderUserID", userId)
        .order("CreatedAt", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastMessageError) {
        console.error(
          "ConversationThreadService: Error getting last client message:",
          lastMessageError,
        );
        return 0;
      }

      // If client has never sent a message, use epoch time
      const lastClientMessageTime = lastClientMessage?.CreatedAt || '1970-01-01T00:00:00.000Z';
      
      console.log(
        `ConversationThreadService: Client's last message time: ${lastClientMessageTime}`,
      );

      // Count admin messages sent after client's last message
      const { data: adminMessages, error: adminMessagesError } = await supabase
        .from("Messages")
        .select("MessageID, Content, CreatedAt")
        .eq("ChannelID", channel.ChannelID)
        .neq("SenderUserID", userId) // Admin messages only
        .gt("CreatedAt", lastClientMessageTime);

      if (adminMessagesError) {
        console.error(
          "ConversationThreadService: Error counting admin messages:",
          adminMessagesError,
        );
        return 0;
      }

      const count = adminMessages?.length || 0;
      console.log(
        `ConversationThreadService: Found ${count} unanswered admin messages`,
        adminMessages?.map(msg => ({ 
          id: msg.MessageID, 
          content: msg.Content.substring(0, 50) + '...', 
          time: msg.CreatedAt 
        }))
      );
      
      return count;
    } catch (error) {
      console.error("ConversationThreadService: Error getting unanswered count:", error);
      return 0;
    }
  }

  // Reset conversation thread (mark as read) - sets badge to 0
  static async resetConversationThread(
    clientId: string,
    userId: string,
    reason: 'reply' | 'mark_read' = 'reply'
  ): Promise<void> {
    try {
      console.log(
        `ConversationThreadService: Resetting conversation thread for client ${clientId} (reason: ${reason})`,
      );

      // Emit badge update to reset count to 0
      conversationThreadEventEmitter.emit(clientId);
      
      console.log(
        `ConversationThreadService: Conversation thread reset successfully (reason: ${reason})`,
      );
    } catch (error) {
      console.error("ConversationThreadService: Error resetting conversation thread:", error);
    }
  }

  // Get timestamp of client's last message (for debugging)
  static async getLastClientMessageTime(
    clientId: string,
    userId: string,
  ): Promise<string | null> {
    try {
      const { data: channel } = await supabase
        .from("ChatChannels")
        .select("ChannelID")
        .eq("ClientID", clientId)
        .single();

      if (!channel) return null;

      const { data: lastMessage } = await supabase
        .from("Messages")
        .select("CreatedAt")
        .eq("ChannelID", channel.ChannelID)
        .eq("SenderUserID", userId)
        .order("CreatedAt", { ascending: false })
        .limit(1)
        .maybeSingle();

      return lastMessage?.CreatedAt || null;
    } catch (error) {
      console.error("ConversationThreadService: Error getting last client message time:", error);
      return null;
    }
  }

  // Subscribe to real-time conversation thread updates
  static subscribeToConversationThreadUpdates(
    clientId: string,
    userId: string,
    callback: (count: number) => void,
  ) {
    console.log(
      `ConversationThreadService: Setting up subscription for client ${clientId}`,
    );

    const channel = supabase.channel(`conversation-thread-${clientId}`);

    // Listen for new messages
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "Messages",
      },
      async (payload) => {
        console.log(
          "ConversationThreadService: New message received:",
          payload.new,
        );

        // Check if this message affects the current client's conversation
        const { data: messageChannel } = await supabase
          .from("ChatChannels")
          .select("ClientID")
          .eq("ChannelID", payload.new.ChannelID)
          .single();

        if (messageChannel?.ClientID === clientId) {
          console.log(
            "ConversationThreadService: Message affects current client, updating count",
          );
          
          // If message is from client, reset count to 0
          if (payload.new.SenderUserID === userId) {
            console.log(
              "ConversationThreadService: Message is from client, resetting count to 0",
            );
            callback(0);
          } else {
            // If message is from admin, recalculate count
            console.log(
              "ConversationThreadService: Message is from admin, recalculating count",
            );
            const count = await this.getUnansweredMessageCount(clientId, userId);
            callback(count);
          }
        }
      },
    );

    channel.subscribe();

    return {
      unsubscribe: () => {
        console.log(
          `ConversationThreadService: Unsubscribing from conversation thread updates for client ${clientId}`,
        );
        supabase.removeChannel(channel);
      },
    };
  }

  // Emit event to trigger badge updates (for immediate updates)
  static emitBadgeUpdate(clientId: string) {
    conversationThreadEventEmitter.emit(clientId);
  }
}
