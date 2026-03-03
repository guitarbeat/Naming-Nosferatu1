import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CircuitBreaker } from './errorManager';

describe('CircuitBreaker', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should initialize with CLOSED state', () => {
        const cb = new CircuitBreaker();
        expect(cb.state).toBe('CLOSED');
        expect(cb.failureCount).toBe(0);
    });

    it('should successfully execute a function when CLOSED', async () => {
        const cb = new CircuitBreaker();
        const fn = vi.fn().mockResolvedValue('success');

        const result = await cb.execute(fn);

        expect(result).toBe('success');
        expect(cb.state).toBe('CLOSED');
        expect(cb.failureCount).toBe(0);
        expect(fn).toHaveBeenCalledOnce();
    });

    it('should transition to OPEN after failureThreshold is reached', async () => {
        const threshold = 3;
        const cb = new CircuitBreaker(threshold);
        const error = new Error('Test error');
        const fn = vi.fn().mockRejectedValue(error);

        // Fail threshold - 1 times
        for (let i = 0; i < threshold - 1; i++) {
            await expect(cb.execute(fn)).rejects.toThrow('Test error');
            expect(cb.state).toBe('CLOSED');
            expect(cb.failureCount).toBe(i + 1);
        }

        // Fail the threshold-th time
        await expect(cb.execute(fn)).rejects.toThrow('Test error');
        expect(cb.state).toBe('OPEN');
        expect(cb.failureCount).toBe(threshold);
    });

    it('should reject immediately when OPEN without calling the function', async () => {
        const cb = new CircuitBreaker(2);
        const fn = vi.fn().mockRejectedValue(new Error('Test error'));

        await expect(cb.execute(fn)).rejects.toThrow('Test error');
        await expect(cb.execute(fn)).rejects.toThrow('Test error');

        expect(cb.state).toBe('OPEN');

        const nextFn = vi.fn().mockResolvedValue('should not be called');
        await expect(cb.execute(nextFn)).rejects.toThrow('Circuit breaker is OPEN');
        expect(nextFn).not.toHaveBeenCalled();
    });

    it('should transition to HALF_OPEN after resetTimeout', async () => {
        const timeout = 1000;
        const cb = new CircuitBreaker(1, timeout);
        const fn = vi.fn().mockRejectedValue(new Error('Test error'));

        // Trip the circuit
        await expect(cb.execute(fn)).rejects.toThrow('Test error');
        expect(cb.state).toBe('OPEN');

        // Advance time by timeout
        vi.advanceTimersByTime(timeout);

        // The first call after timeout should be allowed to try and will succeed here
        const successFn = vi.fn().mockResolvedValue('success recovery');
        const result = await cb.execute(successFn);

        // During execution of execute(fn), the state transitions to HALF_OPEN
        // Then since the fn succeeds, it transitions back to CLOSED
        expect(result).toBe('success recovery');
        expect(cb.state).toBe('CLOSED');
        expect(cb.failureCount).toBe(0);
        expect(successFn).toHaveBeenCalledOnce();
    });

    it('should transition from HALF_OPEN back to OPEN if it fails again', async () => {
        const timeout = 1000;
        const cb = new CircuitBreaker(1, timeout);
        const failFn = vi.fn().mockRejectedValue(new Error('Test error'));

        // Trip the circuit
        await expect(cb.execute(failFn)).rejects.toThrow('Test error');
        expect(cb.state).toBe('OPEN');

        // Advance time by timeout
        vi.advanceTimersByTime(timeout);

        // Try again, but it fails
        const anotherFailFn = vi.fn().mockRejectedValue(new Error('Another error'));
        await expect(cb.execute(anotherFailFn)).rejects.toThrow('Another error');

        // State goes back to OPEN immediately, and failure count increments (or stays at threshold depending on implementation, here it increments)
        expect(cb.state).toBe('OPEN');
        expect(cb.failureCount).toBe(2);
    });
});
