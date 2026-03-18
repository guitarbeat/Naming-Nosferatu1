/**
 * @module useWebSocket
 * @description React hook for WebSocket integration
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { getWebSocketService } from "../services/websocketService";
import type { TournamentUpdate, MatchResult, UserActivity, ConnectionMetrics } from "../services/websocketService";

interface UseWebSocketOptions {
	url?: string;
	autoConnect?: boolean;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
	const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
	const [lastMessage, setLastMessage] = useState<string>('');
	const [activeUsers, setActiveUsers] = useState<UserActivity[]>([]);
	const [metrics, setMetrics] = useState<ConnectionMetrics>({
		connectedAt: null,
		lastMessageAt: null,
		messagesReceived: 0,
		messagesSent: 0,
		reconnectCount: 0,
		averageLatency: 0,
	});
	const wsServiceRef = useRef<ReturnType<typeof getWebSocketService> | null>(null);
	const unsubscribeRefs = useRef<Set<() => void>>(new Set());

	// Initialize WebSocket service
	useEffect(() => {
		if (!wsServiceRef.current && options.url) {
			wsServiceRef.current = getWebSocketService(options.url);
			
			if (options.autoConnect) {
				wsServiceRef.current.connect().catch(console.error);
			}

			// Subscribe to connection state changes
			const unsubscribeConnectionState = wsServiceRef.current.onConnectionStateChange((state) => {
				setConnectionState(state);
			});

			unsubscribeRefs.current.add(unsubscribeConnectionState);
		}

		return () => {
			// Clean up all subscriptions
			unsubscribeRefs.current.forEach(unsubscribe => unsubscribe());
			unsubscribeRefs.current.clear();
			
			wsServiceRef.current?.disconnect();
			wsServiceRef.current = null;
		};
	}, [options.url, options.autoConnect]);

	// Connection state management
	const connect = useCallback(() => {
		if (wsServiceRef.current) {
			wsServiceRef.current.connect().catch(console.error);
		}
	}, []);

	const disconnect = useCallback(() => {
		if (wsServiceRef.current) {
			wsServiceRef.current.disconnect();
		}
	}, []);

	// Update metrics and connection state
	useEffect(() => {
		if (wsServiceRef.current) {
			// Update metrics periodically
			const metricsInterval = setInterval(() => {
				if (wsServiceRef.current) {
					const currentMetrics = wsServiceRef.current.getMetrics();
					setMetrics(currentMetrics);
				}
			}, 1000);

			return () => {
				clearInterval(metricsInterval);
			};
		}
	}, [wsServiceRef.current]);

	// Tournament subscription
	const subscribeToTournament = useCallback((tournamentId: string, callback: (update: TournamentUpdate) => void) => {
		if (wsServiceRef.current) {
			const unsubscribe = wsServiceRef.current.subscribeToTournament(tournamentId, callback);
			unsubscribeRefs.current.add(unsubscribe);
			return unsubscribe;
		}
		return () => {};
	}, [wsServiceRef.current]);

	// Match results subscription
	const subscribeToMatches = useCallback((callback: (result: MatchResult) => void) => {
		if (wsServiceRef.current) {
			const unsubscribe = wsServiceRef.current.subscribeToMatches(callback);
			unsubscribeRefs.current.add(unsubscribe);
			return unsubscribe;
		}
		return () => {};
	}, [wsServiceRef.current]);

	// User activity subscription
	const subscribeToUserActivity = useCallback((callback: (activity: UserActivity) => void) => {
		if (wsServiceRef.current) {
			const unsubscribe = wsServiceRef.current.subscribeToUserActivity(callback);
			unsubscribeRefs.current.add(unsubscribe);
			return unsubscribe;
		}
		return () => {};
	}, [wsServiceRef.current]);

	// Send custom message
	const sendMessage = useCallback((message: any) => {
		if (wsServiceRef.current) {
			wsServiceRef.current.sendMessage(message);
		}
	}, [wsServiceRef.current]);

	// Clear message queue
	const clearMessageQueue = useCallback(() => {
		if (wsServiceRef.current) {
			wsServiceRef.current.clearMessageQueue();
		}
	}, [wsServiceRef.current]);

	// Handle incoming messages
	useEffect(() => {
		if (wsServiceRef.current) {
			wsServiceRef.current.onMessage('tournament_update', (message) => {
				if (message.data && typeof message.data === 'object') {
					const update = message.data as TournamentUpdate;
					setLastMessage(`Tournament ${update.tournamentId} updated: Round ${update.round}, Match ${update.matchNumber}`);
				}
			});

			wsServiceRef.current.onMessage('match_result', (message) => {
				if (message.data && typeof message.data === 'object') {
					const result = message.data as MatchResult;
					setLastMessage(`Match completed: ${result.winnerId} defeated ${result.loserId}`);
				}
			});

			wsServiceRef.current.onMessage('user_joined', (message) => {
				if (message.data && typeof message.data === 'object') {
					const activity = message.data as UserActivity;
					setActiveUsers(prev => [...prev.filter(u => u.userId !== activity.userId), activity]);
				}
			});

			wsServiceRef.current.onMessage('user_left', (message) => {
				if (message.data && typeof message.data === 'object') {
					const activity = message.data as UserActivity;
					setActiveUsers(prev => prev.filter(u => u.userId !== activity.userId));
				}
			});
		}
	}, [wsServiceRef.current]);

	return {
		connectionState,
		lastMessage,
		activeUsers,
		metrics,
		connect,
		disconnect,
		subscribeToTournament,
		subscribeToMatches,
		subscribeToUserActivity,
		sendMessage,
		clearMessageQueue,
		isConnected: wsServiceRef.current?.isConnected() ?? false,
	};
};
