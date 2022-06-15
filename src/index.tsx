import React, { Dispatch } from 'react';
import type { Manager } from './devtools/Manager';

export const $ACTION = Symbol('ACTION');
export const $PREV_STATE = Symbol('PREV_STATE');
export const DEBUG_TRANSITIONS = Symbol('DEBUG_TRANSITIONS');
export const DEBUG_COMMAND = Symbol('DEBUG_COMMAND');
export const DEBUG_ID = Symbol('DEBUG_ID');

const DEBUG_TRIGGER_TRANSITIONS = Symbol('DEBUG_TRIGGER_TRANSITIONS');

export interface IState {
  state: string;
  [$ACTION]?: IAction;
  [$PREV_STATE]?: IState;
}

export interface IAction {
  type: string;
}

type TMatch<S extends IState, R = any> = {
  [SS in S['state']]: (state: S & { state: SS }) => R;
};

type TPartialMatch<S extends IState, R = any> = {
  [SS in S['state']]?: (state: S & { state: SS }) => R;
};

export type PickState<S extends IState, T extends S['state'] = never> = [T] extends [never]
  ? S
  : S extends { state: T }
  ? S
  : never;

export type PickAction<A extends IAction, T extends A['type']> = A extends { type: T } ? A : never;

export type TTransition<S extends IState, A extends IAction, SS extends S['state'] = S['state']> = {
  [AA in A['type']]?: (state: S & { state: SS }, action: A extends { type: AA } ? A : never) => S;
};

export type TTransitions<S extends IState, A extends IAction> = {
  [SS in S['state']]: TTransition<S, A, SS>;
};

export function transition<S extends IState, A extends IAction>(
  state: S,
  action: A,
  transitions: TTransitions<S, A>,
): S & { [$ACTION]?: A; [$PREV_STATE]?: S } {
  let newState = state;

  // @ts-ignore
  const debugId = state[DEBUG_ID];

  // @ts-ignore
  if (transitions[state.state] && transitions[state.state][action.type]) {
    // @ts-ignore
    newState = transitions[state.state][action.type](state, action);
    newState[$ACTION] = action;
    // @ts-ignore
    action[$ACTION] && newState !== state && action[$ACTION](debugId, false);
    newState[$PREV_STATE] = state;
  } else {
    // @ts-ignore
    action[$ACTION] && action[$ACTION](debugId, true);
  }

  if (debugId) {
    // @ts-ignore
    newState[DEBUG_ID] = debugId;

    // @ts-ignore
    newState[DEBUG_TRANSITIONS] = transitions;
  }

  return newState as any;
}

export function useActionEffect<
  S extends IState,
  AA extends Exclude<S[typeof $ACTION], undefined>['type'] | Exclude<S[typeof $ACTION], undefined>['type'][]
>(
  state: S,
  action: AA,
  effect: (
    state: S,
    action: AA extends Exclude<S[typeof $ACTION], undefined>['type'][]
      ? Exclude<S[typeof $ACTION], undefined> & { type: AA[number] }
      : Exclude<S[typeof $ACTION], undefined> & { type: AA },
    prevState: S,
  ) => void | (() => void),
  deps: unknown[] = [],
): void {
  const stateAction = state[$ACTION];

  React.useEffect(() => {
    // @ts-ignore
    if (Array.isArray(stateAction) ? stateAction.includes(stateAction?.type) : stateAction?.type === action) {
      // @ts-ignore
      effect(state, state[$ACTION], state[$PREV_STATE]);
    }
    // @ts-ignore
  }, deps.concat(state));
}

export function useEnterEffect<S extends IState, SS extends S['state'] | S['state'][]>(
  state: S,
  current: SS,
  effect: (
    state: SS extends S['state'][]
      ? S extends { state: SS[number] }
        ? S
        : never
      : S extends { state: SS }
      ? S
      : never,
    action?: Exclude<S[typeof $ACTION], undefined>,
    prevState?: S,
  ) => void | (() => void),
  deps: unknown[] = [],
): void {
  if (typeof current === 'string') {
    return React.useEffect(() => {
      // @ts-ignore
      if (state.state === current) {
        // @ts-ignore
        return effect(state, state[$ACTION], state[$PREV_STATE]);
      }
      // We only run the effect when actually moving to a new state
      // @ts-ignore
    }, deps.concat(state.state === current));
  }

  if (Array.isArray(current)) {
    // @ts-ignore
    const shouldRun = current.includes(state.state);

    return React.useEffect(() => {
      if (shouldRun) {
        // @ts-ignore
        return effect(state, state[$ACTION], state[$PREV_STATE]);
      }
    }, deps.concat(shouldRun));
  }
}

export function useLeaveEffect<S extends IState, SS extends S['state'] | S['state'][]>(
  state: S,
  current: SS,
  effect: (
    state: SS extends S['state'][]
      ? S extends { state: SS[number] }
        ? S
        : never
      : S extends { state: SS }
      ? S
      : never,
    action: Exclude<S[typeof $ACTION], undefined>,
    prevState: S,
  ) => void,
  deps: unknown[] = [],
): void {
  if (typeof current === 'string') {
    return React.useEffect(
      () => () => {
        // @ts-ignore
        if (state.state === current) {
          // @ts-ignore
          return effect(state, state[$ACTION], state[$PREV_STATE]);
        }
      },
      // We only run the effect when actually moving to a new state
      // @ts-ignore
      deps.concat(state.state === current),
    );
  }

  if (Array.isArray(current)) {
    // @ts-ignore
    const shouldRun = current.includes(state.state);

    return React.useEffect(
      () => () => {
        if (shouldRun) {
          // @ts-ignore
          return effect(state, state[$ACTION], state[$PREV_STATE]);
        }
      },
      deps.concat(shouldRun),
    );
  }
}

export function useTransitionEffect<
  S extends IState,
  SS extends S['state'] | S['state'][],
  AA extends Exclude<S[typeof $ACTION], undefined>['type'] | Exclude<S[typeof $ACTION], undefined>['type'][],
  SF extends S['state'] | S['state'][]
>(
  state: S,
  transition: {
    to: SS;
    action?: AA;
    from?: SF;
  },
  effect: (
    state: SS extends S['state'][]
      ? S extends { state: SS[number] }
        ? S
        : never
      : S extends { state: SS }
      ? S
      : never,
    action: AA extends Exclude<S[typeof $ACTION], undefined>['type'][]
      ? Exclude<S[typeof $ACTION], undefined> & { type: AA[number] }
      : Exclude<S[typeof $ACTION], undefined> & { type: AA },
    prevState: SF extends S['state'][]
      ? S extends { state: SF[number] }
        ? S
        : never
      : S extends { state: SF }
      ? S
      : never,
  ) => void,
  deps?: unknown[],
): void;
export function useTransitionEffect<
  S extends IState,
  SS extends S['state'] | S['state'][],
  AA extends Exclude<S[typeof $ACTION], undefined>['type'] | Exclude<S[typeof $ACTION], undefined>['type'][],
  SF extends S['state'] | S['state'][]
>(
  state: S,
  transition: {
    to?: SS;
    action: AA;
    from?: SF;
  },
  effect: (
    state: SS extends S['state'][]
      ? S extends { state: SS[number] }
        ? S
        : never
      : S extends { state: SS }
      ? S
      : never,
    action: AA extends Exclude<S[typeof $ACTION], undefined>['type'][]
      ? Exclude<S[typeof $ACTION], undefined> & { type: AA[number] }
      : Exclude<S[typeof $ACTION], undefined> & { type: AA },
    prevState: SF extends S['state'][]
      ? S extends { state: SF[number] }
        ? S
        : never
      : S extends { state: SF }
      ? S
      : never,
  ) => void,
  deps?: unknown[],
): void;
export function useTransitionEffect<
  S extends IState,
  SS extends S['state'] | S['state'][],
  AA extends Exclude<S[typeof $ACTION], undefined>['type'] | Exclude<S[typeof $ACTION], undefined>['type'][],
  SF extends S['state'] | S['state'][]
>(
  state: S,
  transition: {
    to?: SS;
    action?: AA;
    from: SF;
  },
  effect: (
    state: SS extends S['state'][]
      ? S extends { state: SS[number] }
        ? S
        : never
      : S extends { state: SS }
      ? S
      : never,
    action: AA extends Exclude<S[typeof $ACTION], undefined>['type'][]
      ? Exclude<S[typeof $ACTION], undefined> & { type: AA[number] }
      : Exclude<S[typeof $ACTION], undefined> & { type: AA },
    prevState: SF extends S['state'][]
      ? S extends { state: SF[number] }
        ? S
        : never
      : S extends { state: SF }
      ? S
      : never,
  ) => void,
  deps?: unknown[],
): void;
export function useTransitionEffect<S extends IState>(
  state: S,
  effect: (state: S, action?: Exclude<S[typeof $ACTION], undefined>, prevState?: S) => void,
  deps?: unknown[],
): void;
export function useTransitionEffect() {
  const state = arguments[0];
  const prevState = state[$PREV_STATE];
  const action = state[$ACTION];

  if (typeof arguments[1] === 'function') {
    const deps = arguments[2] || [];
    const effect = arguments[1];

    return React.useEffect(() => {
      prevState && effect(state, action, prevState);
    }, deps.concat(state));
  }

  const transition = arguments[1];
  const effect = arguments[2];
  const deps = arguments[3] || [];

  React.useEffect(() => {
    if (transition.to) {
      if (typeof transition.to === 'string' && state.state !== transition.to) {
        return;
      }

      if (Array.isArray(transition.to) && !transition.to.includes(prevState?.state)) {
        return;
      }

      if (transition.from) {
        if (typeof transition.from === 'string' && prevState?.state !== transition.from) {
          return;
        }

        if (Array.isArray(transition.from) && !transition.from.includes(prevState?.state)) {
          return;
        }
      }

      if (transition.action) {
        if (typeof transition.action === 'string' && action?.type === transition.action) {
          prevState && effect(state, action, prevState);
        } else if (Array.isArray(transition.action) && transition.action.includes(action?.type)) {
          prevState && effect(state, action, prevState);
        }
        return;
      }

      prevState && effect(state, action, prevState);

      return;
    }

    if (transition.from) {
      if (typeof transition.from === 'string' && prevState?.state !== transition.from) {
        return;
      }

      if (Array.isArray(transition.from) && !transition.from.includes(prevState?.state)) {
        return;
      }

      if (transition.action) {
        if (typeof transition.action === 'string' && action?.type === transition.action) {
          prevState && effect(state, action, prevState);
        } else if (Array.isArray(transition.action) && transition.action.includes(action?.type)) {
          prevState && effect(state, action, prevState);
        }
        return;
      }

      prevState && effect(state, action, prevState);

      return;
    }

    if (transition.action) {
      if (typeof transition.action === 'string' && action?.type === transition.action) {
        prevState && effect(state, action, prevState);
      } else if (Array.isArray(transition.action) && transition.action.includes(action?.type)) {
        prevState && effect(state, action, prevState);
      }
    }
  }, deps.concat(state));
}

/*
export function useTransitionEffect<
  S extends IState,
  SS extends S['state'] | S['state'][],
  AA extends Exclude<S[typeof $ACTION], undefined>['type'],
  SP extends S['state']
>(
  state: S,
  current: SS,
  action: AA,
  prev: SP,
  effect: (
    state: SS extends S['state'][]
      ? S extends { state: SS[number] }
        ? S
        : never
      : S extends { state: SS }
      ? S
      : never,
    action: Exclude<S[typeof $ACTION], undefined> & { type: AA },
    prevState: S extends { state: SP } ? S : never,
  ) => void,
  deps?: unknown[],
): void;
export function useTransitionEffect<
  S extends IState,
  SS extends S['state'] | S['state'][],
  AA extends Exclude<S[typeof $ACTION], undefined>['type']
>(
  state: S,
  current: SS,
  action: AA,
  effect: (
    state: SS extends S['state'][]
      ? S extends { state: SS[number] }
        ? S
        : never
      : S extends { state: SS }
      ? S
      : never,
    action: Exclude<S[typeof $ACTION], undefined> & { type: AA },
    prevState: S,
  ) => void,
  deps?: unknown[],
): void;
export function useTransitionEffect<S extends IState, SS extends S['state'] | S['state'][]>(
  state: S,
  current: SS,
  effect: (
    state: SS extends S['state'][]
      ? S extends { state: SS[number] }
        ? S
        : never
      : S extends { state: SS }
      ? S
      : never,
    action?: Exclude<S[typeof $ACTION], undefined>,
    prevState?: S,
  ) => void | (() => void),
  deps?: unknown[],
): void;
export function useTransitionEffect<S extends IState>(
  state: S,
  effect: (state: S, action?: Exclude<S[typeof $ACTION], undefined>, prevState?: S) => void,
  deps?: unknown[],
): void;
export function useTransitionEffect() {
  const state = arguments[0];
  const deps = Array.isArray(arguments[arguments.length - 1]) ? arguments[arguments.length - 1] : [];

  if (typeof arguments[1] === 'function') {
    return React.useEffect(() => arguments[1](state, state[$ACTION], state[$PREV_STATE]), [state].concat(deps));
  }

  const current = arguments[1];
  const action = arguments[2];
  const prev = arguments[3];
  const effect = arguments[4] || arguments[3] || arguments[2];

  if (typeof current === 'string' && typeof action === 'string' && typeof prev === 'string') {
    return React.useEffect(() => {
      if (state.state === current && state[$ACTION]?.type === action && state[$PREV_STATE]?.state === prev) {
        // @ts-ignore
        effect(state, state[$ACTION], state[$PREV_STATE]);
      }
    }, [state].concat(deps));
  }

  if (Array.isArray(current) && typeof action === 'string' && typeof prev === 'string') {
    return React.useEffect(() => {
      if (current.includes(state.state) && state[$ACTION]?.type === action && state[$PREV_STATE]?.state === prev) {
        // @ts-ignore
        effect(state, state[$ACTION], state[$PREV_STATE]);
      }
    }, [state].concat(deps));
  }

  if (typeof current === 'string' && typeof action === 'string') {
    return React.useEffect(() => {
      if (state.state === current && state[$ACTION]?.type === action) {
        // @ts-ignore
        effect(state, state[$ACTION], state[$PREV_STATE]);
      }
      // We only run the effect when the condition is true
    }, [state].concat(deps));
  }

  if (Array.isArray(current) && typeof action === 'string') {
    return React.useEffect(() => {
      if (current.includes(state.state) && state[$ACTION]?.type === action) {
        // @ts-ignore
        effect(state, state[$ACTION], state[$PREV_STATE]);
      }
      // We only run the effect when the condition is true
    }, [state].concat(deps));
  }

  if (typeof current === 'string') {
    return React.useEffect(() => {
      // @ts-ignore
      if (state.state === current) {
        // @ts-ignore
        return effect(state, state[$ACTION], state[$PREV_STATE]);
      }
      // We only run the effect when actually moving to a new state
      // @ts-ignore
    }, [state.state === current].concat(deps));
  }

  if (Array.isArray(current)) {
    // @ts-ignore
    const shouldRun = current.includes(state.state);

    return React.useEffect(() => {
      if (shouldRun) {
        // @ts-ignore
        return effect(state, state[$ACTION], state[$PREV_STATE]);
      }
    }, [shouldRun].concat(deps));
  }
}
*/

export function match<S extends IState, T extends TMatch<S>>(
  state: S,
  matches: T,
): {
  [K in keyof T]: T[K] extends (...args: any[]) => infer R ? R : never;
}[keyof T];
export function match<S extends IState, T extends TPartialMatch<S>, U>(
  state: S,
  matches: T,
  _: (state: S & { state: Exclude<S['state'], keyof T> }) => U,
):
  | {
      [K in keyof T]: T[K] extends (...args: any[]) => infer R ? R : never;
    }[keyof T]
  | U;
export function match() {
  const state = arguments[0];
  const matches = arguments[1];
  const _ = arguments[2];

  if (_) {
    return (matches[state.state] || _)(state);
  }

  return matches[state.state](state);
}

export function matchProp<
  S extends IState,
  P extends {
    [K in keyof S]: keyof (S & { state: K });
  }[keyof S]
>(state: S, prop: P): S extends Record<P, unknown> ? S : undefined;
export function matchProp() {
  const state = arguments[0];
  const prop = arguments[1];
  // @ts-ignore
  return prop in state ? state : undefined;
}

export const managerContext = React.createContext((null as unknown) as Manager);

// We have to type as any as States<any, any> throws error not matching
// the explicit context
export const useDevtools = (id: string, reducer: [any, any]) => {
  const manager = React.useContext(managerContext);

  // We allow using the hook without having the wrapping devtool
  if (!manager) {
    return reducer;
  }

  const [state, dispatch] = reducer;

  React.useEffect(() => () => manager.dispose(id), [id, manager]);

  // @ts-ignore
  reducer[0][DEBUG_ID] = id;
  // @ts-ignore
  reducer[0][DEBUG_COMMAND] = (command: { cmd: string }) => {
    manager.onMessage(id, {
      type: 'command',
      command,
    });
  };

  reducer[1] = (action: any) => {
    action[$ACTION] = (id: string, isIgnored: boolean) => {
      manager.onMessage(id, {
        type: 'dispatch',
        action,
        ignored: isIgnored,
      });
    };

    dispatch(action);

    if (action.type === DEBUG_TRIGGER_TRANSITIONS) {
      manager.onMessage(id, {
        type: 'transitions',
        // @ts-ignore
        transitions: state[DEBUG_TRANSITIONS],
      });
      return;
    }
  };

  React.useEffect(() => {
    manager.onMessage(id, {
      type: 'state',
      state,
      // @ts-ignore
      transitions: state[DEBUG_TRANSITIONS],
      triggerTransitions: () => {
        // We dispatch to ensure the transition is run
        reducer[1]({
          type: DEBUG_TRIGGER_TRANSITIONS,
        });
      },
    });
  }, [id, manager, state]);

  return reducer;
};

export type TEmit<T extends IAction> = (event: T) => void;

export type TSubscribe<T extends IAction> = (listener: (event: T) => void) => void;

export const createEmitter = <T extends IAction>(): {
  emit: TEmit<T>;
  subscribe: TSubscribe<T>;
} => {
  const listeners: TEmit<T>[] = [];

  return {
    emit(event) {
      listeners.forEach((listener) => listener(event));
    },
    subscribe(listener) {
      listeners.push(listener);

      return () => {
        listeners.splice(listeners.indexOf(listener), 1);
      };
    },
  };
};
