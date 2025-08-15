import { supabase } from "../lib/supabase";
import { getPresignedUrl, uploadFileToS3, validateFile } from "./s3Service";
import { ConversationThreadService } from "./conversationThreadService";

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderType: "admin" | "client";
  content: string;
  timestamp: string;
  isRead: boolean;
  attachments?: ChatAttachment[];
}

export interface ChatAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

export class ChatService {
  // Get messages for the current client
  static async getMessages(clientId: string): Promise<ChatMessage[]> {
    try {
      // First get or create the channel for this client
      const channelId = await this.getOrCreateChannel(clientId);
      if (!channelId) return [];

      const { data: messages, error } = await supabase
        .from("Messages")
        .select(`
          MessageID,
          Content,
          CreatedAt,
          SenderUserID
        `)
        .eq("ChannelID", channelId)
        .order("CreatedAt", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        return [];
      }

      if (!messages) return [];

      // Fetch user info and attachments for each message
      const messagesWithUserInfo = await Promise.all(
        messages.map(async (msg: any) => {
          const { data: user } = await supabase
            .from("Users")
            .select("UserID, FullName, UserType")
            .eq("UserID", msg.SenderUserID)
            .single();

          // Fetch attachments for this message
          const { data: attachments } = await supabase
            .from("MessageAttachments")
            .select("*")
            .eq("MessageID", msg.MessageID);

          let messageAttachments: ChatAttachment[] = [];
          if (attachments && attachments.length > 0) {
            messageAttachments = await Promise.all(
              attachments.map(async (att: any) => {
                const { url } = await getPresignedUrl(att.S3_Key);
                return {
                  id: att.AttachmentID,
                  name: att.OriginalFileName,
                  url: url,
                  type: att.S3_Key.split(".").pop() || "file",
                  size: att.FileSize,
                };
              }),
            );
          }

          return {
            id: msg.MessageID,
            senderId: msg.SenderUserID,
            senderName: user?.FullName || "Unknown User",
            senderType: user?.UserType === "Portal User" ? "client" : "admin",
            content: msg.Content,
            timestamp: msg.CreatedAt,
            isRead: true, // We'll implement read status later
            attachments: messageAttachments,
          };
        }),
      );

      return messagesWithUserInfo;
    } catch (error) {
      console.error("Error in getMessages:", error);
      return [];
    }
  }

  // Send a message
  static async sendMessage(
    clientId: string,
    senderId: string,
    content: string,
  ): Promise<ChatMessage | null> {
    try {
      // First get or create the channel for this client
      const channelId = await this.getOrCreateChannel(clientId);
      if (!channelId) return null;

      const { data: message, error } = await supabase
        .from("Messages")
        .insert({
          ChannelID: channelId,
          SenderUserID: senderId,
          Content: content,
        })
        .select(`
          MessageID,
          Content,
          CreatedAt,
          SenderUserID
        `)
        .single();

      if (error) {
        console.error("Error sending message:", error);
        return null;
      }

      // Fetch user info separately
      const { data: user } = await supabase
        .from("Users")
        .select("UserID, FullName, UserType")
        .eq("UserID", message.SenderUserID)
        .single();

      // Reset conversation thread since client just replied
      await ConversationThreadService.resetConversationThread(clientId, senderId, 'reply');

      return {
        id: message.MessageID,
        senderId: message.SenderUserID,
        senderName: user?.FullName || "Unknown User",
        senderType: user?.UserType === "Portal User" ? "client" : "admin",
        content: message.Content,
        timestamp: message.CreatedAt,
        isRead: true,
      };
    } catch (error) {
      console.error("Error in sendMessage:", error);
      return null;
    }
  }

  // Get or create a channel for a client
  static async getOrCreateChannel(clientId: string): Promise<string | null> {
    try {
      // First, try to get existing channel
      const { data: existingChannel, error: fetchError } = await supabase
        .from("ChatChannels")
        .select("ChannelID")
        .eq("ClientID", clientId)
        .maybeSingle();

      if (fetchError) {
        console.error("Error fetching channel:", fetchError);
        return null;
      }

      if (existingChannel) {
        return existingChannel.ChannelID;
      }

      // If no channel exists, create one
      const { data: newChannel, error: createError } = await supabase
        .from("ChatChannels")
        .insert({ ClientID: clientId })
        .select("ChannelID")
        .single();

      if (createError) {
        console.error("Error creating channel:", createError);
        return null;
      }

      return newChannel.ChannelID;
    } catch (error) {
      console.error("Error in getOrCreateChannel:", error);
      return null;
    }
  }

  // Subscribe to real-time messages for a client
  static async subscribeToMessages(
    clientId: string,
    callback: (message: ChatMessage) => void,
  ) {
    try {
      // First get the channel ID for this client
      const channelId = await this.getOrCreateChannel(clientId);
      if (!channelId) {
        console.error("Client app: Could not get channel ID for subscription");
        return null;
      }

      console.log(
        `Client app: Setting up subscription for channel ${channelId}`,
      );
      const channel = supabase.channel(
        `client-messages-${clientId}-${Date.now()}`,
      );

      channel
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "Messages",
            filter: `ChannelID=eq.${channelId}`,
          },
          async (payload) => {
            try {
              console.log(
                "Client app: New message received via real-time:",
                payload.new,
              );

              // Fetch the complete message with user info
              const { data: message, error } = await supabase
                .from("Messages")
                .select(`
                  MessageID,
                  Content,
                  CreatedAt,
                  SenderUserID
                `)
                .eq("MessageID", payload.new.MessageID)
                .single();

              if (error || !message) {
                console.error(
                  "Client app: Error fetching message details:",
                  error,
                );
                return;
              }

              console.log("Client app: Fetched complete message:", message);

              // Fetch user info separately
              const { data: user } = await supabase
                .from("Users")
                .select("UserID, FullName, UserType")
                .eq("UserID", message.SenderUserID)
                .single();

              // Check for attachments
              const { data: attachments } = await supabase
                .from("MessageAttachments")
                .select("*")
                .eq("MessageID", message.MessageID);

              let messageAttachments: ChatAttachment[] = [];
              if (attachments && attachments.length > 0) {
                messageAttachments = await Promise.all(
                  attachments.map(async (att: any) => {
                    const { url } = await getPresignedUrl(att.S3_Key);
                    return {
                      id: att.AttachmentID,
                      name: att.OriginalFileName,
                      url: url,
                      type: att.S3_Key.split(".").pop() || "file",
                      size: att.FileSize,
                    };
                  }),
                );
              }

              const chatMessage: ChatMessage = {
                id: message.MessageID,
                senderId: message.SenderUserID,
                senderName: user?.FullName || "Unknown User",
                senderType: user?.UserType === "Portal User"
                  ? "client"
                  : "admin",
                content: message.Content,
                timestamp: message.CreatedAt,
                isRead: true,
                attachments: messageAttachments,
              };

              console.log(
                "Client app: Calling callback with message:",
                chatMessage,
              );
              callback(chatMessage);
            } catch (error) {
              console.error(
                "Client app: Error processing real-time message:",
                error,
              );
            }
          },
        )
        .subscribe((status) => {
          console.log(
            `Client app: Subscription status for channel ${channelId}:`,
            status,
          );
        });

      return channel;
    } catch (error) {
      console.error("Client app: Error setting up subscription:", error);
      return null;
    }
  }

  // Unsubscribe from real-time messages
  static unsubscribeFromMessages(channel: any) {
    try {
      if (channel && typeof channel.unsubscribe === "function") {
        channel.unsubscribe();
      } else {
        // Fallback to removeChannel if channel object doesn't have unsubscribe
        console.warn(
          "Channel object doesn't have unsubscribe method, using removeChannel",
        );
      }
    } catch (error) {
      console.warn("Error unsubscribing from messages:", error);
    }
  }

  // Send a message with attachment
  static async sendMessageWithAttachment(
    clientId: string,
    senderId: string,
    content: string,
    file: File,
  ): Promise<ChatMessage | null> {
    try {
      // First get or create the channel for this client
      const channelId = await this.getOrCreateChannel(clientId);
      if (!channelId) return null;

      // Generate unique filename for chat uploads while preserving original name
      const fileExt = file.name.split(".").pop();
      const baseName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      const uniqueFileName = `${baseName}_${timestamp}_${randomId}.${fileExt}`;
      const s3Key = `chat-uploads/${uniqueFileName}`;

      // Upload file to S3
      const uploadResult = await uploadFileToS3(file, s3Key, {
        originalFileName: file.name,
        uploadedBy: senderId,
        clientId: clientId,
      });

      if (uploadResult.error) {
        console.error("Error uploading file:", uploadResult.error);
        return null;
      }

      // Create message in database
      const { data: message, error: messageError } = await supabase
        .from("Messages")
        .insert({
          ChannelID: channelId,
          SenderUserID: senderId,
          Content: content || `Sent a file: ${file.name}`,
        })
        .select(`
          MessageID,
          Content,
          CreatedAt,
          SenderUserID,
          Users!Messages_SenderUserID_fkey(UserID, FullName, UserType)
        `)
        .single();

      if (messageError) {
        console.error("Error creating message:", messageError);
        return null;
      }

      // Create attachment record
      const { error: attachmentError } = await supabase
        .from("MessageAttachments")
        .insert({
          MessageID: message.MessageID,
          OriginalFileName: file.name,
          S3_Key: s3Key,
          FileSize: file.size,
        });

      if (attachmentError) {
        console.error("Error creating attachment record:", attachmentError);
        return null;
      }

      // Get presigned URL for the attachment
      const { url: attachmentUrl } = await getPresignedUrl(s3Key);

      // Reset conversation thread since client just replied
      await ConversationThreadService.resetConversationThread(clientId, senderId, 'reply');

      return {
        id: message.MessageID,
        senderId: message.SenderUserID,
        senderName: message.Users.FullName,
        senderType: message.Users.UserType === "Portal User"
          ? "client"
          : "admin",
        content: message.Content,
        timestamp: message.CreatedAt,
        isRead: true,
        attachments: [{
          id: `${message.MessageID}-attachment`,
          name: file.name,
          url: attachmentUrl,
          type: fileExt || "file",
          size: file.size,
        }],
      };
    } catch (error) {
      console.error("Error in sendMessageWithAttachment:", error);
      return null;
    }
  }
}
