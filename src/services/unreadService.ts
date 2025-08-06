import { supabase } from "../lib/supabase";

export interface UnreadCount {
  conversationId: string;
  count: number;
}

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

  // Mark messages as read for the current user in a client's conversation
  static async markAsRead(
    userId: string,
    clientId?: string,
    userEmail?: string,
  ): Promise<void> {
    try {
      // Ensure the user exists in the Users table
      const userExists = await this.ensureUserExists(userId, userEmail);
      if (!userExists) {
        console.warn(
          "Could not ensure user exists in Users table, cannot mark messages as read:",
          userId,
        );
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
        .neq("SenderUserID", userId)
        .is("MessageReadStatus.UserID", null);

      // Apply channel filter if clientId was provided
      if (clientId && channelFilter.ChannelID) {
        query = query.eq("ChannelID", channelFilter.ChannelID);
      }

      const { data: unreadMessages, error: fetchError } = await query;

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
        console.error("Error marking messages as read:", insertError);
      } else {
        console.log(
          `Successfully marked ${readStatusRecords.length} messages as read for user ${userId}`,
        );
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
