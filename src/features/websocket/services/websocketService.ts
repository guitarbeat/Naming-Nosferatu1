/**
 * @module WebSocketService
 * @description Real-time WebSocket service for live tournament updates
 */

export interface WebSocketMessage {
	type: 'tournament_update' | 'match_result' | 'user_joined' | 'user_left' | 'connection_state' | 'error' | 'ping' | 'pong';
	data: unknown;
	timestamp: number;
	id?: string;
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
	tournamentId?: string;
	userName?: string;
}

export interface ConnectionMetrics {
	connectedAt: number | null;
	lastMessageAt: number | null;
	messagesReceived: number;
	messagesSent: number;
	reconnectCount: number;
	averageLatency: number;
}

export interface QueuedMessage {
	id: string;
	message: Omit<WebSocketMessage, 'timestamp'>;
	timestamp: number;
	retryCount: number;
	maxRetries: number;
}

class WebSocketService {
	private ws: WebSocket | null = null;
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 5;
	private reconnectDelay = 1000; // 1 second
	private messageHandlers = new Map<string, (message: WebSocketMessage) => void>();
	private isConnecting = false;
	private pingInterval: NodeJS.Timeout | null = null;
	private messageQueue: QueuedMessage[] = [];
	private connectionStateChangeHandlers: ((state: 'connecting' | 'connected' | 'disconnected' | 'error') => void)[] = [];
	private metrics: ConnectionMetrics = {
		connectedAt: null,
		lastMessageAt: null,
		messagesReceived: 0,
		messagesSent: 0,
		reconnectCount: 0,
		averageLatency: 0,
	};

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
					this.metrics.connectedAt = Date.now();
					this.metrics.reconnectCount++;
					this.startPingInterval();
					this.processMessageQueue();
					this.notifyConnectionStateChange('connected');
					resolve();
				};

				this.ws.onmessage = (event) => {
					try {
						const message: WebSocketMessage = JSON.parse(event.data);
						this.updateLatency();
						this.handleMessage(message);
					} catch (error) {
						this.sendError('Failed to parse message', error);
					}
				};

				this.ws.onclose = (event) => {
					console.log('WebSocket disconnected:', event.code, event.reason);
					this.ws = null;
					this.stopPingInterval();
					this.notifyConnectionStateChange('disconnected');

					// Attempt to reconnect if not a clean close
					if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
						this.notifyConnectionStateChange('connecting');
						const jitter = Math.random() * 0.5 * this.reconnectDelay;
						setTimeout(() => {
							this.reconnectAttempts++;
							this.metrics.reconnectCount++;
							this.connect().catch((error) => {
								this.sendError('Reconnection failed', error);
								this.notifyConnectionStateChange('error');
							});
						}, (this.reconnectDelay * Math.pow(2, this.reconnectAttempts)) + jitter);
					}
				};

				this.ws.onerror = (error) => {
					console.error('WebSocket error:', error);
					this.isConnecting = false;
					this.notifyConnectionStateChange('error');
					this.sendError('WebSocket connection error', error);
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
		this.stopPingInterval();
		this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
		this.messageQueue = [];
		this.notifyConnectionStateChange('disconnected');
	}

	sendMessage(message: Omit<WebSocketMessage, 'timestamp'>): void {
		if (this.ws?.readyState === WebSocket.OPEN) {
			const fullMessage: WebSocketMessage = {
				...message,
				timestamp: Date.now(),
			};
			this.ws.send(JSON.stringify(fullMessage));
			this.metrics.messagesSent++;
			this.metrics.lastMessageAt = Date.now();
			}
		} else {
			console.warn('WebSocket not connected, queuing message:', message);
			this.queueMessage(message);
		}
	}

	// Message handlers
	onMessage(type: string, handler: (message: WebSocketMessage) => void): () => void {
		if (!this.messageHandlers.has(type)) {
			this.messageHandlers.set(type, new Set());
		}
		this.messageHandlers.get(type)!.add(handler);
		
		// Return unsubscribe function
		return () => {
			const handlers = this.messageHandlers.get(type);
			if (handlers) {
				handlers.delete(handler);
				if (handlers.size === 0) {
					this.messageHandlers.delete(type);
				}
			}
		};
	}

	offMessage(type: string, handler?: (message: WebSocketMessage) => void): void {
		if (handler) {
			const handlers = this.messageHandlers.get(type);
			if (handlers) {
				handlers.delete(handler);
				if (handlers.size === 0) {
					this.messageHandlers.delete(type);
				}
			}
		} else {
			this.messageHandlers.delete(type);
		}
	}

	private handleMessage(message: WebSocketMessage): void {
		// Validate message structure
		if (!this.validateMessage(message)) {
			console.error('Invalid message structure:', message);
			return;
		}

		const handlers = this.messageHandlers.get(message.type);
		if (handlers) {
			handlers.forEach(handler => {
				try {
					handler(message);
				} catch (error) {
					console.error('Error in message handler:', error);
				}
			});
		}
	}

	// Helper methods for enhanced functionality
	private generateMessageId(): string {
		return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	private queueMessage(message: Omit<WebSocketMessage, 'timestamp'>): void {
		const queuedMessage: QueuedMessage = {
			message,
			timestamp: Date.now(),
			retryCount: 0,
			maxRetries: 3,
		};
		this.messageQueue.push(queuedMessage);
		
		// Limit queue size to prevent memory issues
		if (this.messageQueue.length > 50) {
			this.messageQueue.shift();
		}
	}

	private processMessageQueue(): void {
		const messagesToSend = [...this.messageQueue];
		this.messageQueue = [];
		
		messagesToSend.forEach(queuedMessage => {
			if (queuedMessage.retryCount < queuedMessage.maxRetries) {
				this.sendMessage({
					...queuedMessage.message,
				});
				queuedMessage.retryCount++;
				if (queuedMessage.retryCount < queuedMessage.maxRetries) {
					this.messageQueue.push(queuedMessage);
				}
			}
		});
	}

	private validateMessage(message: WebSocketMessage): boolean {
		return (
			message &&
			typeof message === 'object' &&
			typeof message.type === 'string' &&
			typeof message.timestamp === 'number' &&
			message.timestamp > 0
		);
	}

	private startPingInterval(): void {
		this.stopPingInterval();
		this.pingInterval = setInterval(() => {
			if (this.ws?.readyState === WebSocket.OPEN) {
				this.sendMessage({
					type: 'ping',
					data: null,
				});
			}
		}, 30000); // Ping every 30 seconds
	}

	private stopPingInterval(): void {
		if (this.pingInterval) {
			clearInterval(this.pingInterval);
			this.pingInterval = null;
		}
	}

	private updateLatency(latency: number): void {
		// Simple moving average for latency
		this.metrics.averageLatency = this.metrics.averageLatency * 0.8 + latency * 0.2;
	}

	private notifyConnectionStateChange(state: 'connecting' | 'connected' | 'disconnected' | 'error'): void {
		this.connectionStateListeners.forEach(listener => {
			try {
				listener(state);
			} catch (error) {
				console.error('Error in connection state listener:', error);
			}
		});
	}

	private sendError(message: string, error?: any): void {
		this.sendMessage({
			type: 'error',
			data: { message, error: error?.message || 'Unknown error' },
		});
	}

	// Public API for enhanced features
	onConnectionStateChange(listener: (state: 'connecting' | 'connected' | 'disconnected' | 'error') => void): () => void {
		this.connectionStateListeners.add(listener);
		return () => this.connectionStateListeners.delete(listener);
	}

	getMetrics(): ConnectionMetrics {
		return { ...this.metrics };
	}

	clearMessageQueue(): void {
		this.messageQueue = [];
	}
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
