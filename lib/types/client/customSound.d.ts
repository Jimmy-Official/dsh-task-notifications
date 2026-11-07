/** Browsers cap localStorage per origin; one megabyte of audio stays well inside it. */
export declare const MAX_CUSTOM_SOUND_BYTES: number;
export type SoundFileProblem = 'empty' | 'too-large' | 'unsupported-type';
export interface CustomSound {
    readonly name: string;
    readonly dataUri: string;
}
/** The audio MIME a picked file should be treated as, or null when it is not audio at all. */
export declare function soundMime(file: {
    readonly type: string;
    readonly name?: string;
}): string | null;
/** Rejects files a picker may hand over but the player cannot use; pure so it is testable without a DOM. */
export declare function checkSoundFile(file: {
    readonly size: number;
    readonly type: string;
    readonly name?: string;
}): SoundFileProblem | null;
export declare function loadCustomSound(): CustomSound | null;
/** Throws when the origin quota is exhausted; the caller turns that into a message. */
export declare function saveCustomSound(sound: CustomSound): void;
export declare function clearCustomSound(): void;
/** Reads a picked file into a data URI, rejecting whatever `checkSoundFile` refuses. */
export declare function readSoundFile(file: File): Promise<CustomSound>;
/**
 * Plays a data URI and reports whether the browser could decode it.
 * Autoplay may be blocked right after an asynchronous file read; `canplaythrough`
 * still proves the bytes are usable, so that counts as success.
 */
export declare function playSound(dataUri: string): Promise<boolean>;
//# sourceMappingURL=customSound.d.ts.map