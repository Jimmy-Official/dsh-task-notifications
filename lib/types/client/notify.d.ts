import { type CustomSound } from './customSound.ts';
/** Records one step of the reminder path so a failed click can be diagnosed from disk afterwards. */
export declare function diag(step: string): void;
import type { SoundMode } from './settings.ts';
export declare function armNotificationPermission(): void;
/** Resolves the audio source for a mode; a custom sound that is missing falls back to the bundled default. */
export declare function soundSource(mode: SoundMode, custom: CustomSound | null): string | null;
/** A short, non-actionable message in the corner; used when a jump target cannot be opened. */
export declare function showMessage(text: string): void;
export declare function showNotification(title: string, body: string, sound: SoundMode, activate?: () => void): void;
//# sourceMappingURL=notify.d.ts.map