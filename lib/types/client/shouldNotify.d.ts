import type { CompletionEvent } from '../detect.ts';
import type { TaskNotificationSettings } from './settings.ts';
/** Permission prompts and questions have their own controls; turns follow the completion mode. */
export declare function shouldNotify(event: CompletionEvent, settings: TaskNotificationSettings, focused: boolean): boolean;
//# sourceMappingURL=shouldNotify.d.ts.map