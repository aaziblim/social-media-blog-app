# API Guide — Spherespace

This document provides quick REST and WebSocket examples for the chat features and related endpoints.

## REST Endpoints

- `GET /api/conversations/` — list conversations for current user.
- `POST /api/conversations/` — start a conversation: JSON `{ "username": "target_user" }`.
- `GET /api/conversations/<conversation_id>/messages/` — list messages in a conversation.
- `POST /api/conversations/<conversation_id>/messages/` — send message: form data `content` (or JSON).
- `POST /api/conversations/<conversation_id>/action/` — accept/decline/delete conversation: `{ "action": "accept" }`.
- `POST /api/messages/<message_id>/action/` — unsend message: `{ "action": "unsend" }`.
- `GET /api/message-requests/` — list pending message requests.
- `GET /api/unread-count/` — get total unread messages count.

### Example: fetchConversations (curl)

```bash
curl -H "Authorization: Bearer <JWT_TOKEN>" \
  https://api.example.com/api/conversations/
```

### Example: send message (fetch)

```js
// Using fetch to POST a message
fetch('/api/conversations/<conversation_id>/messages/', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ content: 'Hello!' })
})
```

## WebSocket Usage

- Endpoint: `ws://<host>/ws/chat/?token=<JWT_TOKEN>` (use `wss://` in production)
- Messages are JSON objects. Common types:
  - `chat_message` — send a chat message
    ```json
    { "type": "chat_message", "conversation_id": "<uuid>", "content": "Hi!" }
    ```
  - `typing` — typing indicator
    ```json
    { "type": "typing", "conversation_id": "<uuid>", "is_typing": true }
    ```
  - `mark_read` — mark messages read
    ```json
    { "type": "mark_read", "conversation_id": "<uuid>" }
    ```

### Example (browser WebSocket client)

```js
const ws = new WebSocket(`ws://${window.location.host}/ws/chat/?token=${token}`);
ws.onopen = () => console.log('connected');
ws.onmessage = (ev) => console.log('msg', JSON.parse(ev.data));

// send message
ws.send(JSON.stringify({ type: 'chat_message', conversation_id, content: 'Hello' }));
```

## Error handling & tips

- If the JWT is invalid the WS connection will be closed — ensure the token is fresh.
- In production use `channels_redis` with a Redis instance for channel layers.
- The frontend hook `useChatWebSocket` updates the TanStack Query cache on incoming `new_message` events.


---

For more examples (postman collection or OpenAPI), we can add a `docs/openapi.yaml` next.