export declare const zh: {
    readonly nav: "任务通知";
    readonly title: "通知";
    readonly completion: "轮次完成通知";
    readonly completionHint: "设置 DSH 完成后何时提醒你";
    readonly unfocused: "仅在未聚焦时";
    readonly always: "始终";
    readonly off: "关闭";
    readonly permission: "启用权限通知";
    readonly permissionHint: "在需要通知权限时显示提醒";
    readonly question: "启用问题通知";
    readonly questionHint: "在需要回答问题才能继续时显示通知";
    readonly sound: "通知提示音";
    readonly soundHint: "任务完成、请求权限和提问时的提示音";
    readonly default: "默认";
    readonly classic: "经典";
    readonly custom: "自定义…";
    readonly none: "无";
    readonly customHint: "导入你自己的提示音，只保存在本机浏览器";
    readonly customEmpty: "未选择文件";
    readonly customChoose: "选择文件";
    readonly customReplace: "更换文件";
    readonly customPreview: "试听";
    readonly customRemove: "移除";
    readonly customReading: "读取中…";
    readonly customTooLarge: "文件太大（上限 1 MB）";
    readonly customUnsupported: "请选择音频文件";
    readonly customEmptyFile: "文件是空的";
    readonly customUnreadable: "读取失败，换个文件试试";
    readonly customUnplayable: "这个文件无法播放";
    readonly customQuota: "浏览器存储空间不足，换个小一点的音频";
    readonly turnTitle: "DSH 任务已完成";
    readonly turnBodyFallback: "任务已完成，点击查看对话";
    readonly permissionTitle: "DSH 需要权限";
    readonly questionTitle: "DSH 需要你回答问题";
    readonly jumpFailed: "没能切换到该对话，请手动在左侧列表里选择";
};
export type LocaleKey = keyof typeof zh;
export declare const en: Record<LocaleKey, string>;
export declare const NS = "dsh-task-notifications";
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        'dsh-task-notifications': LocaleKey;
    }
}
//# sourceMappingURL=locales.d.ts.map