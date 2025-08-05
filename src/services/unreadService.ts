import { supabase } from "../lib/supabase";

export interface UnreadCount {
  conversationId: string;
  count: number;
}

export class UnreadService {
  // Get unread message count for a client's conversation
  static async getUnreadCount(clientId: string): Promise<number> {
    try {
      // First get the channel for this client
      const { data: channel, error: channelError } = await supabase
        .from("ChatChannels")
        .select("ChannelID")
        .eq("ClientID", clientId)
        .single();

      if (channelError || !channel) {
        return 0;
      }

      // Count messages in this channel that:
      // 1. Were not sent by the current client
      // 2. Have no read status record for the current client
      const { data: unreadMessages, error } = await supabase
        .from("Messages")
        .select(`
          MessageID,
          MessageReadStatus!left(UserID)
        `)
        .eq("ChannelID", channel.ChannelID)
        .neq("SenderUserID", clientId)
        .is("MessageReadStatus.UserID", null);

      if (error) {
        console.error("Error counting unread messages:", error);
        return 0;
      }

      return unreadMessages?.length || 0;
    } catch (error) {
      console.error("Error getting unread count:", error);
      return 0;
    }
  }

  // Mark messages as read for a client's conversation
  static async markAsRead(clientId: string): Promise<void> {
    try {
      // First get the channel for this client
      const { data: channel, error: channelError } = await supabase
        .from("ChatChannels")
        .select("ChannelID")
        .eq("ClientID", clientId)
        .single();

      if (channelError || !channel) {
        return;
      }

      // Get all unread messages in this channel for this client
      const { data: unreadMessages, error: fetchError } = await supabase
        .from("Messages")
        .select(`
          MessageID,
          MessageReadStatus!left(UserID)
        `)
        .eq("ChannelID", channel.ChannelID)
        .neq("SenderUserID", clientId)
        .is("MessageReadStatus.UserID", null);

      if (fetchError) {
        console.error("Error fetching unread messages:", fetchError);
        return;
      }

      if (!unreadMessages || unreadMessages.length === 0) {
        return; // No unread messages
      }

      // Create read status records for all unread messages
      const readStatusRecords = unreadMessages.map((msg) => ({
        MessageID: msg.MessageID,
        UserID: clientId,
      }));

      const { error: insertError } = await supabase
        .from("MessageReadStatus")
        .insert(readStatusRecords);

      if (insertError) {
        console.error("Error marking messages as read:", insertError);
      }
    } catch (error) {
      console.error("Error in markAsRead:", error);
    }
  }

  // Subscribe to new messages for unread count updates
  static subscribeToUnreadUpdates(
    clientId: string,
    callback: (unreadCount: number) => void,
  ) {
    const channel = supabase.channel(
      `unread-updates-${clientId}-${Date.now()}`,
    );

    // Listen for new messages
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "Messages",
      },
      async (payload) => {
        // Only count if message is not from current client
        if (payload.new.SenderUserID !== clientId) {
          const unreadCount = await this.getUnreadCount(clientId);
          callback(unreadCount);
        }
      },
    );

    // Listen for read status changes
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "MessageReadStatus",
      },
      async (payload) => {
        // Only update if this client marked something as read
        if (payload.new.UserID === clientId) {
          const unreadCount = await this.getUnreadCount(clientId);
          callback(unreadCount);
        }
      },
    );

    channel.subscribe();

    return channel;
  }

  // Unsubscribe from unread updates
  static unsubscribeFromUnreadUpdates(channel: any) {
    try {
      if (channel && typeof channel.unsubscribe === "function") {
        channel.unsubscribe();
      }
    } catch (error) {
      console.warn("Error unsubscribing from unread updates:", error);
    }
  }
}
