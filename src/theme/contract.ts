/**
 * Theme extension contract, capabilities, and options.
 */

import {
    AVAILABLE,
    needs,
    schema,
    type Availability,
    type StorageProvider,
} from '@flybyme/mesh-web';
import { type ThemeMode } from '../contracts/theme.js';

export * from '../contracts/theme.js';

export interface ThemeOptions {
    readonly storage?: StorageProvider;
    readonly initialMode?: ThemeMode;
}

export const NEEDS = needs('state', 'log', 'commands');

export const PUBLISHES = {
    commands: [
        {
            action: 'setMode',
            description: 'Change the active theme preset or mode',
            input: schema<{ mode: string }>(),
            output: schema<void>(),
            available: (): Availability => AVAILABLE,
        },
        {
            action: 'toggleMode',
            description: 'Toggle between dark and light preset themes',
            input: schema<void>(),
            output: schema<void>(),
            available: (): Availability => AVAILABLE,
        },
        {
            action: 'reset',
            description: 'Reset all tokens to standard dark mode defaults',
            input: schema<void>(),
            output: schema<void>(),
            available: (): Availability => AVAILABLE,
        },
    ],
} as const;
