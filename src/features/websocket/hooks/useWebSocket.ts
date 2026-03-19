/**
 * @module useWebSocket
 * @description React hook for WebSocket integration
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { getWebSocketService } from "../services/websocketService";
import type { TournamentUpdate, MatchResult, UserActivity } from "../services/websocketService";

interface UseWebSocketOptions {
	url?: string;
	autoConnect?: boolean;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
	const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
	const [lastMessage, setLastMessage] = useState<string>('');
	const [activeUsers, setActiveUsers] = useState<UserActivity[]>([]);
	const wsServiceRef = useRef<ReturnType<typeof getWebSocketService> | null>(null);

	// Initialize WebSocket service
	useEffect(() => {
		if (!wsServiceRef.current && options.url) {
			wsServiceRef.current = getWebSocketService(options.url);
			
			if (options.autoConnect) {
				wsServiceRef.current.connect().catch(console.error);
			}
		}

		return () => {
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

	// Update connection state
	useEffect(() => {
		if (wsServiceRef.current) {
			const updateConnectionState = () => {
				const state = wsServiceRef.current.getConnectionState();
				setConnectionState(state);
			};

			// Listen for connection state changes
			const interval = setInterval(updateConnectionState, 1000);
			wsServiceRef.current.onMessage('connection_state', (message) => {
				if (message.data) {
					setConnectionState(message.data as 'connecting' | 'connected' | 'disconnected' | 'error');
				}
			});

			return () => {
				clearInterval(interval);
				wsServiceRef.current.offMessage('connection_state');
			};
		}
	}, [wsServiceRef.current]);

	// Tournament subscription
	const subscribeToTournament = useCallback((tournamentId: string, callback: (update: TournamentUpdate) => void) => {
		if (wsServiceRef.current) {
			return wsServiceRef.current.subscribeToTournament(tournamentId, callback);
		}
	}, [wsServiceRef.current]);

	// Match results subscription
	const subscribeToMatches = useCallback((callback: (result: MatchResult) => void) => {
		if (wsServiceRef.current) {
			return wsServiceRef.current.subscribeToMatches(callback);
		}
	}, [wsServiceRef.current]);

	// User activity subscription
	const subscribeToUserActivity = useCallback((callback: (activity: UserActivity) => void) => {
		if (wsServiceRef.current) {
			return wsServiceRef.current.subscribeToUserActivity(callback);
		}
	}, [wsServiceRef.current]);

	// Send custom message
	const sendMessage = useCallback((message: any) => {
		if (wsServiceRef.current) {
			wsServiceRef.current.sendMessage(message);
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
		connect,
		disconnect,
		subscribeToTournament,
		subscribeToMatches,
		subscribeToUserActivity,
		sendMessage,
		isConnected: wsServiceRef.current?.isConnected() ?? false,
	};
};
