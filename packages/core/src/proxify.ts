import { Lens } from './types';

const proxify = (target: any) => {
    return new Proxy(target, {
        get(target: { derive: (lens: Lens[]) => any } & Record<string, any>, prop: any) {
            if (target[prop] !== undefined) {
                return target[prop];
            }
            if (typeof prop === 'symbol') return;
            return target.derive([
                {
                    key: 'focus ' + prop,
                    get: (s) => s[prop],
                    set: (a, s) =>
                        Array.isArray(s) ? [...s.slice(0, prop), a, ...s.slice(prop + 1)] : { ...s, [prop]: a },
                },
            ]);
        },
    });
};

export default proxify;