/**
 * @module WebSocketService
 * @description Real-time WebSocket service for live tournament updates
 */

export interface WebSocketMessage {
	type: 'tournament_update' | 'match_result' | 'user_joined' | 'user_left';
	data: unknown;
	timestamp: number;
}

export interface TournamentUpdate {
	tournamentId: string;
	round: number;
	matchNumber: number;
	currentMatch: {
		leftId: string | null;
		rightId: string | null;
	};
	status: 'in_progress' | 'completed';
}

export interface MatchResult {
	tournamentId: string;
	matchId: string;
	winnerId: string;
	loserId: string;
	newRatings: Record<string, number>;
}

export interface UserActivity {
	userId: string;
	action: 'joined' | 'left';
	timestamp: number;
}

class WebSocketService {
	private ws: WebSocket | null = null;
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 5;
	private reconnectDelay = 1000; // 1 second
	private messageHandlers = new Map<string, (message: WebSocketMessage) => void>();
	private isConnecting = false;

	constructor(private url: string) {}

	connect(): Promise<void> {
		return new Promise((resolve, reject) => {
			if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
				resolve();
				return;
			}

			this.isConnecting = true;
			
			try {
				this.ws = new WebSocket(this.url);
				
				this.ws.onopen = () => {
					console.log('WebSocket connected');
					this.isConnecting = false;
					this.reconnectAttempts = 0;
					resolve();
				};

				this.ws.onmessage = (event) => {
					try {
						const message: WebSocketMessage = JSON.parse(event.data);
						this.handleMessage(message);
					} catch (error) {
						console.error('Failed to parse WebSocket message:', error);
					}
				};

				this.ws.onclose = (event) => {
					console.log('WebSocket disconnected:', event.code, event.reason);
					this.ws = null;
					
					// Attempt to reconnect if not a clean close
					if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
						setTimeout(() => {
							this.reconnectAttempts++;
							this.connect().catch(console.error);
						}, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
					}
				};

				this.ws.onerror = (error) => {
					console.error('WebSocket error:', error);
					this.isConnecting = false;
					reject(error);
				};

			} catch (error) {
				this.isConnecting = false;
				reject(error);
			}
		});
	}

	disconnect(): void {
		if (this.ws) {
			this.ws.close(1000, 'Client disconnect');
			this.ws = null;
		}
		this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
	}

	sendMessage(message: Omit<WebSocketMessage, 'timestamp'>): void {
		if (this.ws?.readyState === WebSocket.OPEN) {
			const fullMessage: WebSocketMessage = {
				...message,
				timestamp: Date.now(),
			};
			this.ws.send(JSON.stringify(fullMessage));
		} else {
			console.warn('WebSocket not connected, message not sent:', message);
		}
	}

	// Message handlers
	onMessage(type: string, handler: (message: WebSocketMessage) => void): void {
		this.messageHandlers.set(type, handler);
	}

	offMessage(type: string): void {
		this.messageHandlers.delete(type);
	}

	private handleMessage(message: WebSocketMessage): void {
		const handler = this.messageHandlers.get(message.type);
		if (handler) {
			handler(message);
		}
	}

	// Public API methods
	subscribeToTournament(tournamentId: string, callback: (update: TournamentUpdate) => void): () => void {
		this.onMessage('tournament_update', (message) => {
			if (message.data && typeof message.data === 'object' && 'tournamentId' in message.data) {
				const update = message.data as TournamentUpdate;
				if (update.tournamentId === tournamentId) {
					callback(update);
				}
			}
		});

		return () => {
			this.offMessage('tournament_update');
		};
	}

	subscribeToMatches(callback: (result: MatchResult) => void): () => void {
		this.onMessage('match_result', (message) => {
			if (message.data && typeof message.data === 'object') {
				callback(message.data as MatchResult);
			}
		});

		return () => {
			this.offMessage('match_result');
		};
	}

	subscribeToUserActivity(callback: (activity: UserActivity) => void): () => void {
		this.onMessage('user_joined', (message) => {
			if (message.data && typeof message.data === 'object') {
				callback(message.data as UserActivity);
			}
		});

		this.onMessage('user_left', (message) => {
			if (message.data && typeof message.data === 'object') {
				callback(message.data as UserActivity);
			}
		});

		return () => {
			this.offMessage('user_joined');
			this.offMessage('user_left');
		};
	}

	getConnectionState(): 'connecting' | 'connected' | 'disconnected' {
		if (this.isConnecting) return 'connecting';
		if (this.ws?.readyState === WebSocket.OPEN) return 'connected';
		return 'disconnected';
	}

	isConnected(): boolean {
		return this.ws?.readyState === WebSocket.OPEN;
	}
}

// Singleton instance
let wsService: WebSocketService | null = null;

export const getWebSocketService = (url: string): WebSocketService => {
	if (!wsService) {
		wsService = new WebSocketService(url);
	}
	return wsService;
};
