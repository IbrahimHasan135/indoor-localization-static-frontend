/** In-memory message history, filtering, and export serialization. */
export class MessageLogService {
  constructor() { this.messages = []; }

  record(topic, payload, receivedAt = new Date().toISOString()) {
    const message = { receivedAt, topic, payload };
    this.messages.unshift(message);
    return message;
  }

  getMessages(query = '') {
    const needle = query.trim().toLowerCase();
    if (!needle) return [...this.messages];
    return this.messages.filter(({ topic, payload }) => `${topic} ${payload}`.toLowerCase().includes(needle));
  }

  exportMessages() {
    return this.messages.map(({ receivedAt, topic, payload }) => {
      let parsedPayload = payload;
      try { parsedPayload = JSON.parse(payload); } catch { /* keep non-JSON MQTT payload as text */ }
      return { received_at: receivedAt, topic, payload: parsedPayload };
    });
  }

  clear() { this.messages = []; }
  get count() { return this.messages.length; }
}
