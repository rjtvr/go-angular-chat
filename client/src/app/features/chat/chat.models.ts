export type MessageType = 'chat' | 'system' | 'welcome';

/** Mirrors the Go Message struct in server/message.go. */
export interface ChatMessage {
  type: MessageType;
  sender?: string;
  content: string;
  sentAt: string; // Go's time.Time arrives as an ISO 8601 string
}

/** What the browser sends; the server fills in the rest. */
export interface OutgoingMessage {
  content: string;
}

export type ConnectionStatus = 'connecting' | 'online' | 'offline';
