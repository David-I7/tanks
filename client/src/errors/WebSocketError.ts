export default class WebSocketError extends Error {
  constructor(message?: string) {
    super(message);
  }
}
