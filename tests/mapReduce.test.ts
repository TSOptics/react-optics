import { optic } from '../src';
import { getElemsWithPath, getFoldGroups } from '../src/mapReduce';
import { Lens } from '../src/types';
import { noop } from '../src/utils';

describe('getFoldGroups', () => {
    const lens = { get: noop, set: noop, key: '' };
    const lenses: Lens[] = [
        { ...lens },
        { ...lens, type: 'map', key: 'opening group 1' },
        { ...lens },
        { ...lens, type: 'map' },
        { ...lens },
        { ...lens, type: 'reduce', key: 'reducing group 1' },
        { ...lens },
        { ...lens, type: 'map', key: 'opening group 2' },
        { ...lens, type: 'map' },
        { ...lens, type: 'map' },
        { ...lens, type: 'reduce', key: 'reducing group 2' },
        { ...lens, type: 'map', key: 'opening group 3' },
    ];
    it('should group map and reduce optics', () => {
        expect(getFoldGroups(lenses)).toEqual([
            {
                openingTraversal: { ...lens, type: 'map', key: 'opening group 1' },
                reduce: { ...lens, type: 'reduce', key: 'reducing group 1' },
            },
            {
                openingTraversal: { ...lens, type: 'map', key: 'opening group 2' },
                reduce: { ...lens, type: 'reduce', key: 'reducing group 2' },
            },
        ]);
    });
});

const state: {
    playerList: {
        name: string;
        inventory: { name: string; durability: number; enchantement?: { fire?: number } }[];
    }[];
} = {
    playerList: [
        {
            name: 'player1',
            inventory: [
                { name: 'weapon1', durability: 12, enchantement: { fire: 32 } },
                { name: 'weapon2', durability: 6, enchantement: { fire: undefined } },
            ],
        },
        {
            name: 'player2',
            inventory: [
                { name: 'weapon3', durability: 2 },
                { name: 'weapon4', durability: 7, enchantement: { fire: 54 } },
            ],
        },
    ],
};
const onState = optic<typeof state>();
const onInventoriesMap = onState.focus('playerList').map().focus('inventory').map();
const onDurabilities = onInventoriesMap.focus('durability');
const onFire = onInventoriesMap.focus('enchantement?.fire');

describe('traversal', () => {
    describe('getElemsWithPath', () => {
        const elemsWithPath = getElemsWithPath(state, onDurabilities.ˍˍunsafeGetLenses());
        it('should return elems and their respective index paths', () => {
            expect(elemsWithPath).toEqual([
                [[0, 0], 12],
                [[0, 1], 6],
                [[1, 0], 2],
                [[1, 1], 7],
            ]);
        });
        it('shoud filter out the nullables returned by partial optics', () => {
            expect(getElemsWithPath(state, onFire.ˍˍunsafeGetLenses())).toEqual([
                [[0, 0], 32],
                [[1, 1], 54],
            ]);
        });
    });
    it('shoud return the array from the successive call to map', () => {
        expect(onDurabilities.get(state)).toEqual([12, 6, 2, 7]);
    });
    it("should exlude elems where partial didn't resolve", () => {
        expect(onFire.get(state)).toEqual([32, undefined, 54]);
    });
    it('should increment by one all elems of the traversal', () => {
        const newState = onFire.set((x) => (x ? x + 1 : 1), state);
        expect(onFire.get(newState)).toEqual([33, 1, 55]);
    });
    it('should replace all elems of the traversal', () => {
        const newState = onFire.set(42, state);
        expect(onFire.get(newState)).toEqual([42, 42, 42]);
    });
    it('should be referentially stable', () => {
        expect(onDurabilities.get(state)).toBe(onDurabilities.get(state));
        expect(onDurabilities.set((x) => x + 1 - 1, state)).toBe(state);
    });
});
describe('fold', () => {});
