import { devError } from "@/shared/lib/basic";

interface SyncPayload {
	userId: string;
	ratings: Array<{
		nameId: string | number;
		rating: number;
		wins?: number;
		losses?: number;
	}>;
}

interface SyncItem {
	id: string;
	type: "SAVE_RATINGS";
	payload: SyncPayload;
	timestamp: number;
	retryCount: number;
}

class SyncQueueService {
	private queue: SyncItem[] = [];
	private readonly STORAGE_KEY = "offline_sync_queue";

	constructor() {
		this.load();
	}

	private load() {
		try {
			const stored = localStorage.getItem(this.STORAGE_KEY);
			if (stored) {
				this.queue = JSON.parse(stored);
			}
		} catch (e) {
			devError("Failed to load sync queue", e);
		}
	}

	private save() {
		try {
			localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue));
		} catch (e) {
			devError("Failed to save sync queue", e);
		}
	}

	enqueue(type: SyncItem["type"], payload: SyncPayload) {
		const item: SyncItem = {
			id: crypto.randomUUID(),
			type,
			payload,
			timestamp: Date.now(),
			retryCount: 0,
		};
		this.queue.push(item);
		this.save();
	}

	dequeue(): SyncItem | undefined {
		const item = this.queue.shift();
		this.save();
		return item;
	}

	peek(): SyncItem | undefined {
		return this.queue[0];
	}

	isEmpty(): boolean {
		return this.queue.length === 0;
	}

	getQueue(): SyncItem[] {
		return [...this.queue];
	}

	clear() {
		this.queue = [];
		this.save();
	}
}

const syncQueueInstance = new SyncQueueService();
export const syncQueue = syncQueueInstance;
