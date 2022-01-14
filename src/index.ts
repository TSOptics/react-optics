export type { Optic } from './Optic';
export { optic, opticPartial } from './Optic';
export { total, partial, map, reduce } from './types';

import Provider from './react/provider';
export { Provider };

import useOptic from './react/useOptic';
import useArrayOptic from './react/useArrayOptic';
import createStore from './react/createStore';
export { useOptic, useArrayOptic, createStore };
