import {
	createUint32SparseSet,
	sparseSetAdd,
	sparseSetHas,
	sparseSetRemove,
	sparseSetGetLength,
	sparseSetOnGrow,
} from './Uint32SparseSet';
import { test, describe, vi } from 'vitest';
import assert from 'assert';
import { $buffer, $length } from './symbols';

describe('Uint32SparseSet', () => {
	test('count initially zero', () => {
		const set = createUint32SparseSet(10, 100);
		assert.strictEqual(set.dense.length, 0);
	});

	test('add and has value', () => {
		const set = createUint32SparseSet(10, 100);
		sparseSetAdd(set, 5);
		assert.strictEqual(sparseSetHas(set, 5), true);
	});

	test('add value increases count', () => {
		const set = createUint32SparseSet(10, 100);
		sparseSetAdd(set, 1);
		assert.strictEqual(set.dense.length, 1);
		sparseSetAdd(set, 2);
		assert.strictEqual(set.dense.length, 2);
	});

	test('add same value does not increase count', () => {
		const set = createUint32SparseSet(10, 100);
		sparseSetAdd(set, 1);
		sparseSetAdd(set, 1);
		assert.strictEqual(set.dense.length, 1);
	});

	test('remove decreases count', () => {
		const set = createUint32SparseSet(10, 100);
		sparseSetAdd(set, 1);
		sparseSetAdd(set, 2);
		sparseSetRemove(set, 1);
		assert.strictEqual(set.dense.length, 1);
	});

	test('remove non-existent value does not change count', () => {
		const set = createUint32SparseSet(10, 100);
		sparseSetAdd(set, 1);
		sparseSetRemove(set, 2);
		assert.strictEqual(set.dense.length, 1);
	});

	test('has returns false for removed value', () => {
		const set = createUint32SparseSet(10, 100);
		sparseSetAdd(set, 1);
		sparseSetRemove(set, 1);
		assert.strictEqual(sparseSetHas(set, 1), false);
	});

	test('remove swaps and updates indices correctly', () => {
		const set = createUint32SparseSet(10, 100);
		sparseSetAdd(set, 1);
		sparseSetAdd(set, 2);
		sparseSetRemove(set, 1);
		assert.strictEqual(sparseSetHas(set, 2), true);
		assert.strictEqual(sparseSetHas(set, 1), false);
	});

	test('add expands buffer if needed', () => {
		const set = createUint32SparseSet(1, 10);
		sparseSetAdd(set, 1);
		sparseSetAdd(set, 2); // This should trigger an expansion
		assert.strictEqual(sparseSetHas(set, 2), true);
	});

	test('expands to max but not over', () => {
		const set = createUint32SparseSet(10, 100);
		for (let i = 0; i < 100; i++) {
			sparseSetAdd(set, i);
		}
		assert.strictEqual(set.dense.length, 100);
	});

	test('add does not expand buffer unnecessarily', () => {
		const initialLength = 10;
		const set = createUint32SparseSet(initialLength, 100);
		for (let i = 0; i < initialLength; i++) {
			sparseSetAdd(set, i);
		}
		assert.strictEqual(set.dense.length, initialLength);
	});

	test('count, add, remove, and has work with large values', () => {
		const set = createUint32SparseSet(10, 100);
		const largeValue = 2 ** 31; // large int value
		sparseSetAdd(set, largeValue);
		assert.strictEqual(sparseSetHas(set, largeValue), true);
		sparseSetRemove(set, largeValue);
		assert.strictEqual(sparseSetHas(set, largeValue), false);
	});

	test('getLength returns the correct length', () => {
		const set = createUint32SparseSet(10, 100);
		sparseSetAdd(set, 1);
		sparseSetAdd(set, 2);
		assert.strictEqual(sparseSetGetLength(set), 2);
	});

	test('onGrow is called when necessary', () => {
		const initialCapacity = 10;
		const set = createUint32SparseSet(initialCapacity, 100);

		const onGrowCb = vi.fn();
		sparseSetOnGrow(set, onGrowCb);

		for (let i = 0; i < initialCapacity + 1; i++) {
			sparseSetAdd(set, i);
		}

		assert.strictEqual(onGrowCb.mock.calls.length, 1);
		const [params] = onGrowCb.mock.calls[0];
		assert.strictEqual(params.didGrowInPlace, true);
		assert.strictEqual(params.prevSize, initialCapacity * Uint32Array.BYTES_PER_ELEMENT);
		assert.strictEqual(params.newSize, params.newBuffer.byteLength);
	});
});