import { ChatConversation, ChatMessage } from "../types";
import { ChatService } from "./chatService";
import { supabase } from "../lib/supabase";

export interface ExportOptions {
    startDate?: string;
    endDate?: string;
    conversationId?: string; // If provided, export only this conversation
    includeAllConversations?: boolean;
}

export interface ExportData {
    conversations: ChatConversation[];
    messages: ChatMessage[];
    totalMessages: number;
    dateRange: {
        start: string;
        end: string;
    };
}

export class ChatExportService {
    /**
     * Export chat messages to Excel file
     */
    static async exportToExcel(options: ExportOptions): Promise<void> {
        try {
            console.log(
                "ChatExportService: Starting export with options:",
                options,
            );

            // Dynamic import of XLSX
            const XLSX = await import("xlsx");

            const exportData = await this.gatherExportData(options);

            if (exportData.messages.length === 0) {
                throw new Error("No messages found for the selected criteria");
            }

            const workbook = await this.createExcelWorkbook(exportData);
            const filename = this.generateFilename(options);

            // Write and download the file
            XLSX.writeFile(workbook, filename);

            console.log("ChatExportService: Export completed successfully");
        } catch (error) {
            console.error("ChatExportService: Export failed:", error);
            throw error;
        }
    }

    /**
     * Gather all data needed for export
     */
    private static async gatherExportData(
        options: ExportOptions,
    ): Promise<ExportData> {
        const { startDate, endDate, conversationId, includeAllConversations } =
            options;

        let conversations: ChatConversation[] = [];
        let allMessages: ChatMessage[] = [];

        if (conversationId) {
            // Export single conversation
            const conversation = await this.getConversationById(conversationId);
            if (conversation) {
                conversations = [conversation];
                const messages = await this.getMessagesForConversation(
                    conversationId,
                    startDate,
                    endDate,
                );
                allMessages = messages;
            }
        } else if (includeAllConversations) {
            // Export all conversations
            conversations = await ChatService.getConversations();

            for (const conversation of conversations) {
                const messages = await this.getMessagesForConversation(
                    conversation.id,
                    startDate,
                    endDate,
                );
                allMessages = [...allMessages, ...messages];
            }
        }

        // Sort messages by timestamp
        allMessages.sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        return {
            conversations,
            messages: allMessages,
            totalMessages: allMessages.length,
            dateRange: {
                start: startDate || "All time",
                end: endDate || "All time",
            },
        };
    }

    /**
     * Get conversation by ID
     */
    private static async getConversationById(
        conversationId: string,
    ): Promise<ChatConversation | null> {
        try {
            const conversations = await ChatService.getConversations();
            return conversations.find((conv) => conv.id === conversationId) ||
                null;
        } catch (error) {
            console.error("Error fetching conversation:", error);
            return null;
        }
    }

    /**
     * Get messages for a conversation with optional date filtering
     */
    private static async getMessagesForConversation(
        conversationId: string,
        startDate?: string,
        endDate?: string,
    ): Promise<ChatMessage[]> {
        try {
            let query = supabase
                .from("Messages")
                .select(`
          MessageID,
          Content,
          CreatedAt,
          SenderUserID,
          ChannelID,
          Users!Messages_SenderUserID_fkey(UserID, FullName, UserType)
        `)
                .eq("ChannelID", conversationId)
                .order("CreatedAt", { ascending: true });

            // Apply date filters if provided
            if (startDate) {
                query = query.gte("CreatedAt", startDate);
            }
            if (endDate) {
                // Add end of day to include the entire end date
                const endDateTime = new Date(endDate);
                endDateTime.setHours(23, 59, 59, 999);
                query = query.lte("CreatedAt", endDateTime.toISOString());
            }

            const { data: messages, error } = await query;

            if (error) {
                console.error("Error fetching messages for export:", error);
                return [];
            }

            if (!messages) return [];

            // Transform to ChatMessage format
            return messages.map((msg: any) => ({
                id: msg.MessageID,
                senderId: msg.SenderUserID,
                senderName: msg.Users?.FullName || "Unknown",
                senderType: msg.Users?.UserType === "Portal User"
                    ? "client"
                    : "admin",
                content: msg.Content,
                timestamp: msg.CreatedAt,
                isRead: true,
                conversationId: msg.ChannelID,
            }));
        } catch (error) {
            console.error("Error in getMessagesForConversation:", error);
            return [];
        }
    }

    /**
     * Create Excel workbook with chat data
     */
    private static async createExcelWorkbook(
        exportData: ExportData,
    ): Promise<any> {
        // Dynamic import of XLSX
        const XLSX = await import("xlsx");
        const workbook = XLSX.utils.book_new();

        // Create summary sheet
        const summaryData = [
            ["Chat Export Summary"],
            [""],
            ["Export Date:", new Date().toLocaleString()],
            [
                "Date Range:",
                `${exportData.dateRange.start} to ${exportData.dateRange.end}`,
            ],
            ["Total Conversations:", exportData.conversations.length],
            ["Total Messages:", exportData.totalMessages],
            [""],
            ["Conversations Included:"],
            ["Client Name", "Client Email", "Messages Count"],
        ];

        // Add conversation details
        exportData.conversations.forEach((conv) => {
            const messageCount = exportData.messages.filter((msg) =>
                (msg as any).conversationId === conv.id
            ).length;
            summaryData.push([conv.clientName, conv.clientEmail, messageCount]);
        });

        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

        // Create messages sheet
        const messagesData = [
            [
                "Date/Time",
                "Client Name",
                "Sender Name",
                "Sender Type",
                "Message Content",
                "Conversation ID",
            ],
        ];

        exportData.messages.forEach((msg) => {
            const conversation = exportData.conversations.find((conv) =>
                conv.id === (msg as any).conversationId
            );

            messagesData.push([
                new Date(msg.timestamp).toLocaleString(),
                conversation?.clientName || "Unknown",
                msg.senderName,
                msg.senderType === "admin" ? "Admin" : "Client",
                msg.content,
                (msg as any).conversationId || "",
            ]);
        });

        const messagesSheet = XLSX.utils.aoa_to_sheet(messagesData);

        // Set column widths
        messagesSheet["!cols"] = [
            { width: 20 }, // Date/Time
            { width: 25 }, // Client Name
            { width: 20 }, // Sender Name
            { width: 12 }, // Sender Type
            { width: 50 }, // Message Content
            { width: 15 }, // Conversation ID
        ];

        XLSX.utils.book_append_sheet(workbook, messagesSheet, "Messages");

        return workbook;
    }

    /**
     * Generate filename for export
     */
    private static generateFilename(options: ExportOptions): string {
        const timestamp = new Date().toISOString().split("T")[0];
        const timeStr = new Date().toTimeString().split(" ")[0].replace(
            /:/g,
            "-",
        );

        if (options.conversationId) {
            return `chat_conversation_${timestamp}_${timeStr}.xlsx`;
        } else {
            return `chat_export_${timestamp}_${timeStr}.xlsx`;
        }
    }

    /**
     * Get available date range for messages
     */
    static async getMessageDateRange(): Promise<
        { earliest: string; latest: string } | null
    > {
        try {
            const { data, error } = await supabase
                .from("Messages")
                .select("CreatedAt")
                .order("CreatedAt", { ascending: true })
                .limit(1);

            const { data: latestData, error: latestError } = await supabase
                .from("Messages")
                .select("CreatedAt")
                .order("CreatedAt", { ascending: false })
                .limit(1);

            if (
                error || latestError || !data || !latestData ||
                data.length === 0 ||
                latestData.length === 0
            ) {
                return null;
            }

            return {
                earliest: data[0].CreatedAt.split("T")[0],
                latest: latestData[0].CreatedAt.split("T")[0],
            };
        } catch (error) {
            console.error("Error getting message date range:", error);
            return null;
        }
    }
}
