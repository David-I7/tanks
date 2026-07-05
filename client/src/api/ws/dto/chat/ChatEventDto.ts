export type ChatEventType = "CHAT_MESSAGE" | "CHAT_TYPE";

export type ChatEventPayload = { message: string } | null;

export type ChatEvent = {
    sender: string;
    type: ChatEventType;
    payload: ChatEventPayload;
}