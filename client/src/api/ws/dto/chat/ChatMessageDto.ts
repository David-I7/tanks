export type HeadersOnlyMessageDto = {
  type: "TYPING" | "DISCONNECT" | "CONNECT";
};

type MessageDto = {
  type: "MESSAGE";
  message: string;
};

export type ChatMessageRequestDto = HeadersOnlyMessageDto | MessageDto;
export type ChatMessageResponseDto = ChatMessageRequestDto & { sender: string };
