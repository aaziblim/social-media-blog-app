import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../AuthContext';
import type { Message } from '../types';

type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
type TimeoutHandle = ReturnType<typeof setTimeout>;

interface WebSocketMessage {
  type: string;
  message?: Message;
  conversation_id?: string;
  user_id?: number;
  username?: string;
  is_typing?: boolean;
  reader_id?: number;
  count?: number;
}

interface TypingStatus {
  [conversationId: string]: {
    username: string;
    isTyping: boolean;
    timeout?: TimeoutHandle;
  };
}

interface UseChatWebSocketReturn {
  status: WebSocketStatus;
  sendMessage: (conversationId: string, content: string) => void;
  sendTyping: (conversationId: string, isTyping: boolean) => void;
  markAsRead: (conversationId: string) => void;
  typingStatus: TypingStatus;
}

export function useChatWebSocket(): UseChatWebSocketReturn {
  const { user } = useAuth();
  const token = user && 'token' in user ? (user as { token?: string }).token : undefined;
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<TimeoutHandle | null>(null);
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const [typingStatus, setTypingStatus] = useState<TypingStatus>({});

  // Get the WebSocket URL
  const getWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = import.meta.env.DEV ? '8000' : window.location.port;
    const wsUrl = `${protocol}//${host}${port ? ':' + port : ''}/ws/chat/?token=${token}`;
    return wsUrl;
  }, [token]);

  // Handle incoming messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data: WebSocketMessage = JSON.parse(event.data);

      switch (data.type) {
        case 'connection_established':
          console.log('✅ Chat WebSocket connected');
          break;

        case 'new_message':
          // Received a new message from someone else
          if (data.message) {
            // Add message to cache immediately
            queryClient.setQueryData(
              ['messages', data.message.conversation_id],
              (old: Message[] | undefined) => {
                if (!old) return [data.message!];
                // Avoid duplicates
                if (old.some(m => m.id === data.message!.id)) return old;
                return [...old, data.message!];
              }
            );
            // Invalidate conversations to update last_message and unread
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            queryClient.invalidateQueries({ queryKey: ['unread-count'] });
          }
          break;

        case 'message_sent':
          // Confirmation that our message was sent
          if (data.message) {
            queryClient.setQueryData(
              ['messages', data.message.conversation_id],
              (old: Message[] | undefined) => {
                if (!old) return [data.message!];
                if (old.some(m => m.id === data.message!.id)) return old;
                return [...old, data.message!];
              }
            );
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
          }
          break;

        case 'typing':
          // Someone is typing
          if (data.conversation_id && data.username) {
            setTypingStatus(prev => {
              // Clear any existing timeout
              if (prev[data.conversation_id!]?.timeout) {
                clearTimeout(prev[data.conversation_id!].timeout);
              }

              // Set timeout to clear typing status after 3 seconds
              const timeout = data.is_typing
                ? setTimeout(() => {
                    setTypingStatus(p => {
                      const { [data.conversation_id!]: _, ...rest } = p;
                      return rest;
                    });
                  }, 3000)
                : undefined;

              if (data.is_typing) {
                return {
                  ...prev,
                  [data.conversation_id!]: {
                    username: data.username!,
                    isTyping: true,
                    timeout,
                  },
                };
              } else {
                const { [data.conversation_id!]: _, ...rest } = prev;
                return rest;
              }
            });
          }
          break;

        case 'messages_read':
          // Someone read our messages
          if (data.conversation_id) {
            queryClient.invalidateQueries({
              queryKey: ['messages', data.conversation_id],
            });
          }
          break;

        case 'error':
          console.error('WebSocket error:', data);
          break;

        case 'pong':
          // Keep-alive response
          break;
      }
    } catch (err) {
      console.error('Failed to parse WebSocket message:', err);
    }
  }, [queryClient]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!user || !token) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus('connecting');

    try {
      const ws = new WebSocket(getWebSocketUrl());

      ws.onopen = () => {
        setStatus('connected');
        // Start ping/pong to keep connection alive
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          } else {
            clearInterval(pingInterval);
          }
        }, 30000);

        (ws as any)._pingInterval = pingInterval;
      };

      ws.onmessage = handleMessage;

      ws.onerror = () => {
        setStatus('error');
      };

      ws.onclose = () => {
        setStatus('disconnected');
        if ((ws as any)._pingInterval) {
          clearInterval((ws as any)._pingInterval);
        }

        // Attempt to reconnect after 5 seconds
        if (user && token) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 5000);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      setStatus('error');
    }
  }, [user, token, getWebSocketUrl, handleMessage]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      if ((wsRef.current as any)._pingInterval) {
        clearInterval((wsRef.current as any)._pingInterval);
      }
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus('disconnected');
  }, []);

  // Send a chat message via WebSocket
  const sendMessage = useCallback((conversationId: string, content: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'chat_message',
          conversation_id: conversationId,
          content,
          message_type: 'text',
        })
      );
    } else {
      console.warn('WebSocket not connected, message will be sent via API');
    }
  }, []);

  // Send typing indicator
  const sendTyping = useCallback((conversationId: string, isTyping: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'typing',
          conversation_id: conversationId,
          is_typing: isTyping,
        })
      );
    }
  }, []);

  // Mark messages as read
  const markAsRead = useCallback((conversationId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'mark_read',
          conversation_id: conversationId,
        })
      );
    }
  }, []);

  // Connect when user is available
  useEffect(() => {
    if (user && token) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [user, token, connect, disconnect]);

  return {
    status,
    sendMessage,
    sendTyping,
    markAsRead,
    typingStatus,
  };
}
