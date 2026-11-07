export type CompletionMode = 'unfocused' | 'always' | 'off';
export type SoundMode = 'default' | 'classic' | 'custom' | 'none';
export interface TaskNotificationSettings {
    completion: CompletionMode;
    permission: boolean;
    question: boolean;
    sound: SoundMode;
    /** Display name of the imported custom sound; empty when none is stored. */
    customName: string;
}
export declare const DEFAULTS: TaskNotificationSettings;
export declare function getSettings(): TaskNotificationSettings;
export declare function subscribeSettings(listener: () => void): () => void;
export declare function setSetting<K extends keyof TaskNotificationSettings>(key: K, value: TaskNotificationSettings[K]): void;
//# sourceMappingURL=settings.d.ts.map