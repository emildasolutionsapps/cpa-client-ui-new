import { supabase } from '../lib/supabase';

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
        .from('ChatChannels')
        .select('ChannelID')
        .eq('ClientID', clientId)
        .single();

      if (channelError || !channel) {
        return 0;
      }

      // Count unread messages in this channel (messages not sent by client)
      const { count, error } = await supabase
        .from('Messages')
        .select('*', { count: 'exact', head: true })
        .eq('ChannelID', channel.ChannelID)
        .neq('SenderUserID', clientId) // Messages not sent by current client
        .eq('IsRead', false); // Unread messages

      if (error) {
        console.error('Error counting unread messages:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Mark messages as read for a client's conversation
  static async markAsRead(clientId: string): Promise<void> {
    try {
      // First get the channel for this client
      const { data: channel, error: channelError } = await supabase
        .from('ChatChannels')
        .select('ChannelID')
        .eq('ClientID', clientId)
        .single();

      if (channelError || !channel) {
        return;
      }

      // Mark all messages in this channel as read (except those sent by client)
      const { error } = await supabase
        .from('Messages')
        .update({ IsRead: true })
        .eq('ChannelID', channel.ChannelID)
        .neq('SenderUserID', clientId); // Only mark messages not sent by current client

      if (error) {
        console.error('Error marking messages as read:', error);
      }
    } catch (error) {
      console.error('Error in markAsRead:', error);
    }
  }

  // Subscribe to new messages for unread count updates
  static subscribeToUnreadUpdates(
    clientId: string,
    callback: (unreadCount: number) => void
  ) {
    const channel = supabase.channel(`unread-updates-${clientId}`);
    
    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Messages',
        },
        async (payload) => {
          // Only count if message is not from current client
          if (payload.new.SenderUserID !== clientId) {
            const unreadCount = await this.getUnreadCount(clientId);
            callback(unreadCount);
          }
        }
      )
      .subscribe();
      
    return channel;
  }

  // Unsubscribe from unread updates
  static unsubscribeFromUnreadUpdates(channel: any) {
    try {
      if (channel && typeof channel.unsubscribe === 'function') {
        channel.unsubscribe();
      }
    } catch (error) {
      console.warn('Error unsubscribing from unread updates:', error);
    }
  }
}
