import { supabase } from "../lib/supabase";

export interface UnreadCount {
  conversationId: string;
  count: number;
}

// Simple event emitter for badge updates
class BadgeEventEmitter {
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

export const badgeEventEmitter = new BadgeEventEmitter();

export class UnreadService {
  // Ensure user exists in Users table (for portal users)
  private static async ensureUserExists(
    userId: string,
    userEmail?: string,
  ): Promise<boolean> {
    try {
      // Check if user already exists
      const { data: existingUser, error: checkError } = await supabase
        .from("Users")
        .select("UserID")
        .eq("UserID", userId)
        .single();

      if (existingUser) {
        return true; // User already exists
      }

      // If user doesn't exist, try to create them
      if (userEmail) {
        const { error: insertError } = await supabase
          .from("Users")
          .insert({
            UserID: userId,
            FullName: userEmail.split("@")[0], // Use email prefix as name
            Email: userEmail,
            UserType: "Portal User",
            IsActive: true,
          });

        if (insertError) {
          console.error("Error creating user record:", insertError);
          return false;
        }

        console.log("Created user record for portal user:", userId);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error ensuring user exists:", error);
      return false;
    }
  }

  // Get unread message count for a client's conversation
  static async getUnreadCount(
    clientId: string,
    userId: string,
  ): Promise<number> {
    try {
      console.log(
        `Client UnreadService: Getting unread count for client ${clientId}`,
      );

      // First get the channel for this client
      const { data: channel, error: channelError } = await supabase
        .from("ChatChannels")
        .select("ChannelID")
        .eq("ClientID", clientId)
        .single();

      if (channelError || !channel) {
        console.log("Client UnreadService: No channel found for client");
        return 0;
      }

      console.log(
        `Client UnreadService: Found channel ${channel.ChannelID} for client`,
      );

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
        .neq("SenderUserID", userId)
        .is("MessageReadStatus.UserID", null);

      if (error) {
        console.error(
          "Client UnreadService: Error counting unread messages:",
          error,
        );
        return 0;
      }

      const count = unreadMessages?.length || 0;
      console.log(
        `Client UnreadService: Found ${count} unread messages for client`,
      );
      return count;
    } catch (error) {
      console.error("Client UnreadService: Error getting unread count:", error);
      return 0;
    }
  }

  // Mark messages as read for a client's conversation
  static async markAsRead(clientId: string, userId: string): Promise<void> {
    try {
      console.log(
        `Client UnreadService: Marking messages as read for client ${clientId} by user ${userId}`,
      );

      // First get the channel for this client
      const { data: channel, error: channelError } = await supabase
        .from("ChatChannels")
        .select("ChannelID")
        .eq("ClientID", clientId)
        .single();

      if (channelError || !channel) {
        console.log("Client UnreadService: No channel found for client");
        return;
      }

      // If clientId is provided, get the specific channel for that client
      // Otherwise, mark all messages as read for this user
      let channelFilter = {};
      if (clientId) {
        const { data: channel, error: channelError } = await supabase
          .from("ChatChannels")
          .select("ChannelID")
          .eq("ClientID", clientId)
          .single();

        if (channelError || !channel) {
          console.warn("No chat channel found for client:", clientId);
          return;
        }
        channelFilter = { ChannelID: channel.ChannelID };
      }

      // Get all unread messages for this user
      let query = supabase
        .from("Messages")
        .select(`
          MessageID,
          MessageReadStatus!left(UserID)
        `)
        .eq("ChannelID", channel.ChannelID)
        .neq("SenderUserID", userId)
        .is("MessageReadStatus.UserID", null);

      // Apply channel filter if clientId was provided
      if (clientId && channelFilter.ChannelID) {
        query = query.eq("ChannelID", channelFilter.ChannelID);
      }

      const { data: unreadMessages, error: fetchError } = await query;

      if (fetchError) {
        console.error(
          "Client UnreadService: Error fetching unread messages:",
          fetchError,
        );
        return;
      }

      if (!unreadMessages || unreadMessages.length === 0) {
        console.log("Client UnreadService: No unread messages to mark as read");
        return; // No unread messages
      }

      console.log(
        `Client UnreadService: Found ${unreadMessages.length} unread messages to mark as read`,
      );

      // Create read status records for all unread messages
      const readStatusRecords = unreadMessages.map((msg) => ({
        MessageID: msg.MessageID,
        UserID: userId,
      }));

      // Use upsert to handle potential duplicates gracefully
      const { error: insertError } = await supabase
        .from("MessageReadStatus")
        .upsert(readStatusRecords, {
          onConflict: "MessageID,UserID",
          ignoreDuplicates: false,
        });

      if (insertError) {
        console.error(
          "Client UnreadService: Error marking messages as read:",
          insertError,
        );
        throw new Error(
          `Failed to mark messages as read: ${insertError.message}`,
        );
      }

      console.log(
        `Client UnreadService: Successfully marked ${readStatusRecords.length} messages as read`,
      );

      // Emit event to trigger badge updates
      badgeEventEmitter.emit(clientId);
    } catch (error) {
      console.error("Client UnreadService: Error in markAsRead:", error);
      throw error; // Re-throw to allow calling code to handle
    }
  }

  // Subscribe to new messages for unread count updates
  static subscribeToUnreadUpdates(
    clientId: string,
    userId: string,
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
        console.log(
          "Client UnreadService: New message received in subscription:",
          payload.new,
        );
        // Only count if message is not from current user
        if (payload.new.SenderUserID !== userId) {
          console.log(
            "Client UnreadService: Message is from admin, updating unread count",
          );
          const unreadCount = await this.getUnreadCount(clientId, userId);
          callback(unreadCount);
        } else {
          console.log(
            "Client UnreadService: Message is from current user, ignoring",
          );
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
        console.log(
          "Client UnreadService: Read status change received:",
          payload.new,
        );
        // Only update if this user marked something as read
        if (payload.new.UserID === userId) {
          console.log(
            "Client UnreadService: Read status change is for current user, updating count",
          );
          const unreadCount = await this.getUnreadCount(clientId, userId);
          callback(unreadCount);
        } else {
          console.log(
            "Client UnreadService: Read status change is for different user, ignoring",
          );
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
