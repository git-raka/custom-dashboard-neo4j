import clsx from "clsx";

const TOKENS = {
  eyebrow:
    "text-[11px] font-extrabold uppercase tracking-[0.2em] text-blue-700",
  "login-eyebrow":
    "text-[13px] font-extrabold uppercase tracking-[0.22em] text-blue-700",
  "login-shell":
    "mx-auto grid min-h-screen w-full max-w-[1520px] grid-cols-1 gap-10 px-6 py-8 xl:grid-cols-[1.08fr_0.92fr] xl:gap-8 xl:px-9 xl:py-10",
  "hero-panel":
    "flex flex-col gap-9 p-0 xl:pt-6",
  "hero-title":
    "my-2 text-balance text-left font-[var(--font-display)] text-[clamp(2.6rem,5vw,4.85rem)] leading-[1.01] tracking-[-0.03em] text-slate-900",
  "hero-description": "text-[1.03rem] leading-[1.82] text-slate-600 text-justify",
  "feature-grid":
    "mt-1 grid gap-4 xl:grid-cols-1 [&_article]:grid [&_article]:gap-2.5 [&_article]:rounded-3xl [&_article]:border [&_article]:border-slate-200 [&_article]:bg-white [&_article]:p-6 [&_article_svg]:mb-1 [&_article_svg]:text-blue-600 [&_article_strong]:text-[1.56rem] [&_article_strong]:leading-tight [&_article_strong]:tracking-[-0.02em] [&_article_span]:text-[1.02rem] [&_article_span]:leading-relaxed [&_article_span]:text-slate-600",
  "login-panel": "flex items-start justify-stretch p-0 xl:pt-6",
  "login-card":
    "w-full max-w-none rounded-[30px] border border-slate-200 bg-white p-8 shadow-sm min-h-[820px] xl:min-h-[calc(100vh-1.5rem)] flex flex-col justify-start xl:sticky xl:top-6 [&_label]:mb-3 [&_label>span]:text-[1.03rem] [&_label>span]:font-medium [&_label>span]:text-slate-700 [&_input]:mt-1 [&_select]:mt-1 [&_button[type='submit']]:mt-6",
  "login-head":
    "mt-16 mb-16 grid justify-items-center gap-3 text-center xl:mt-16 [&_h2]:text-[2.9rem] [&_h2]:leading-[1.04] [&_h2]:tracking-[-0.04em]",
  "security-pill":
    "inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600",
  "dual-grid": "grid grid-cols-1 gap-5 md:grid-cols-2",
  "remote-callout-grid": "my-1 mb-4 grid grid-cols-1 gap-3 md:grid-cols-2",
  "callout-card":
    "flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 [&_svg]:text-blue-600 [&_strong]:mb-1 [&_strong]:block [&_strong]:text-[1.17rem] [&_strong]:leading-tight [&_strong]:tracking-[-0.01em] [&_span]:text-[1.02rem] [&_span]:leading-relaxed [&_span]:text-slate-600",
  "inline-error": "rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700",
  "banner-error": "rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700",
  "hint-row":
    "inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[0.97rem] text-slate-600",
  "primary-button":
    "inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 font-bold text-white transition hover:-translate-y-0.5",
  "ghost-button":
    "inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 font-bold text-slate-900 transition hover:-translate-y-0.5",
  "icon-button":
    "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:-translate-y-0.5",
  "login-button": "my-2 mb-0 w-full",
  "chrome-shell": "grid min-h-screen grid-rows-[auto_1fr] bg-slate-100",
  "chrome-topbar":
    "sticky top-0 z-30 grid grid-cols-1 items-center gap-4 border-b border-slate-200 bg-white px-6 py-3 lg:grid-cols-[260px_1fr_auto]",
  "chrome-brand":
    "flex items-center gap-3 [&_span]:block [&_span]:text-sm [&_span]:text-slate-500",
  "brand-mark":
    "grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 font-[var(--font-display)] text-xl font-bold text-slate-600",
  "chrome-connection":
    "inline-flex max-w-full items-center gap-2 overflow-hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700 lg:justify-self-center [&_span]:truncate [&_em]:not-italic [&_em]:capitalize [&_em]:text-blue-700",
  "chrome-actions": "flex flex-wrap gap-2.5",
  "workspace-shell":
    "grid min-h-0 grid-cols-1 lg:min-h-[calc(100dvh-78px)] lg:grid-cols-[320px_1fr]",
  "neo-sidebar":
    "grid content-start gap-4 border-r border-slate-200 bg-white p-4 lg:sticky lg:top-[78px] lg:min-h-[calc(100dvh-78px)] lg:self-start",
  "sidebar-head":
    "flex items-center justify-between [&_strong]:mt-2 [&_strong]:block [&_strong]:font-[var(--font-display)] [&_strong]:text-lg",
  "sidebar-caption":
    "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-slate-600",
  "sidebar-head-actions": "flex items-center gap-2",
  "sidebar-search":
    "relative grid gap-2 [&_svg]:pointer-events-none [&_svg]:absolute [&_svg]:left-4 [&_svg]:top-[18px] [&_svg]:text-slate-500 [&_input]:pl-11",
  "dashboard-list": "grid gap-2.5",
  "dashboard-row":
    "flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-slate-900 transition hover:-translate-y-0.5",
  "dashboard-row-active": "border-blue-200 bg-blue-50",
  "dashboard-row-copy": "grid gap-1.5 [&_span]:text-sm [&_span]:text-slate-500",
  "sidebar-summary-card": "rounded-3xl border border-slate-200 bg-white p-4",
  "sidebar-summary-head": "mb-3 flex items-center gap-2.5",
  "meta-list":
    "grid gap-2.5 [&_div]:rounded-2xl [&_div]:bg-slate-50 [&_div]:p-3 [&_span]:mb-1 [&_span]:block [&_span]:text-xs [&_span]:uppercase [&_span]:tracking-[0.14em] [&_span]:text-slate-500",
  compact: "",
  "neo-main":
    "flex min-h-0 flex-col gap-4 overflow-visible bg-slate-100 px-4 pb-7 pt-5 lg:pl-6",
  "main-hero": "flex flex-col justify-between gap-4 md:flex-row",
  "main-hero-copy": "[&_p]:mt-3 [&_p]:max-w-[760px] [&_p]:leading-relaxed [&_p]:text-slate-600",
  "title-row": "mt-2 flex items-center gap-3",
  "main-title-input":
    "min-h-16 w-full rounded-2xl border border-slate-300 bg-white px-4 font-[var(--font-display)] text-3xl tracking-[-0.06em] text-slate-900 outline-none transition focus:-translate-y-0.5 focus:border-blue-400",
  "dashboard-tabs": "flex min-h-12 items-center gap-2 overflow-x-auto border-b border-slate-200",
  "dashboard-tab":
    "inline-flex min-h-[46px] flex-none items-center whitespace-nowrap border-b-[3px] border-transparent px-4 text-slate-600 transition hover:-translate-y-0.5",
  "dashboard-tab-active": "border-b-blue-700 text-blue-700",
  add: "h-[46px] w-[42px] justify-center px-0",
  "workspace-headline": "flex flex-wrap gap-2.5",
  "headline-card":
    "inline-flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-600",
  "grid-shell": "w-full min-h-[60vh] overflow-x-hidden overflow-y-visible",
  layout: "min-h-[60vh] min-w-0 max-w-full overflow-hidden",
  "widget-card":
    "flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm",
  "widget-report": "!rounded-md",
  "widget-head": "mb-3 flex flex-wrap items-center justify-between gap-3",
  "widget-drag":
    "inline-flex h-9 w-9 cursor-move items-center justify-center rounded-xl bg-slate-100 text-slate-600",
  "widget-title-block": "min-w-0 flex-1 [&_h3]:mt-1 [&_h3]:text-[1.1rem] [&_h3]:tracking-[-0.03em]",
  "widget-kicker":
    "inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] uppercase tracking-[0.08em] text-slate-600",
  "widget-actions": "ml-auto flex items-center gap-2",
  "query-chip":
    "mb-2 max-w-full truncate rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] uppercase tracking-[0.08em] text-slate-600 md:whitespace-nowrap",
  "widget-body": "flex min-h-0 flex-1 overflow-hidden",
  "widget-empty": "w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-600",
  "widget-error": "w-full rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700",
  "stat-card": "flex w-full flex-col justify-end gap-2",
  "stat-value": "font-[var(--font-display)] text-5xl tracking-[-0.06em]",
  "stat-label": "capitalize text-slate-700",
  "table-shell": "inline-block max-h-80 w-full overflow-auto rounded-2xl border border-slate-200",
  "empty-dashboard": "grid min-h-[50vh] place-items-center",
  "empty-dashboard-card":
    "grid w-full max-w-[420px] gap-2.5 rounded-3xl border border-slate-200 bg-white p-5 text-center [&_svg]:justify-self-center [&_svg]:text-blue-600",
  "modal-backdrop": "fixed inset-0 z-50 grid place-items-center bg-black/60 p-6 backdrop-blur",
  "editor-modal": "w-full max-w-[900px] rounded-[28px] border border-slate-200 bg-white p-7 shadow-xl",
  "modal-head": "flex flex-col items-stretch justify-between gap-3 md:flex-row md:items-center",
  "editor-grid": "grid grid-cols-1 gap-4 md:grid-cols-2",
  "editor-query": "mt-4 grid gap-2.5",
  "recipe-strip": "mt-1 grid grid-cols-1 gap-3 md:grid-cols-3",
  "recipe-card":
    "grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5",
  "modal-actions": "mt-4 flex flex-col gap-3 md:flex-row md:justify-end",
  "add-report-shell": "grid h-full w-full place-items-center",
  "add-report-button":
    "inline-flex h-[62px] w-[62px] items-center justify-center rounded-xl border border-slate-300 bg-slate-100 text-slate-600 shadow-sm",
  "report-template":
    "flex min-h-0 w-full flex-col text-slate-800 [&_p]:m-0 [&_p]:text-[22px] [&_p]:leading-[1.45] [&_p_button]:rounded-full [&_p_button]:bg-slate-300 [&_p_button]:px-3.5 [&_p_button]:py-1.5 [&_p_button]:text-base [&_p_button]:text-slate-700",
  "report-settings-panel": "grid max-h-full min-h-0 w-full gap-4 overflow-y-auto overflow-x-hidden pr-1",
  "report-settings-toolbar": "flex items-center justify-between",
  "report-settings-left": "flex items-center gap-3",
  "report-drag": "h-[26px] w-[26px] rounded-lg bg-transparent",
  "report-icon": "inline-flex h-[30px] w-[30px] items-center justify-center rounded-lg",
  ghost: "text-slate-600",
  danger: "text-red-600",
  success: "text-green-700",
  "report-play-button": "inline-flex h-14 w-14 items-center justify-center rounded-xl text-slate-600",
  "report-settings-grid": "grid grid-cols-1 gap-3",
  "report-field": "grid gap-1.5",
  "report-select-shell": "relative w-full",
  "report-select": "flex w-full min-h-[52px] items-center justify-between rounded-xl border border-slate-300 px-3.5 text-slate-700",
  "report-select-menu":
    "absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-lg",
  "report-select-option":
    "block w-full rounded-xl px-3 py-2.5 text-left text-slate-800 transition hover:bg-slate-100",
  "report-select-option-active": "bg-blue-100 text-blue-700",
  "report-query-box": "border border-slate-300",
  "report-query-hint": "border-t border-slate-300 px-2.5 py-2 text-sm text-slate-500",
  "report-advanced-row": "flex items-center gap-2.5 border-t border-dashed border-slate-300 pt-3 text-slate-800",
  "report-switch":
    "inline-flex h-8 w-14 items-center rounded-full bg-slate-300 p-1 [&_span]:h-[26px] [&_span]:w-[26px] [&_span]:rounded-full [&_span]:bg-slate-50",
  "report-template-head":
    "mb-5 grid grid-cols-[22px_minmax(0,1fr)_22px] items-center gap-2.5 text-slate-400 [&_span]:truncate [&_span]:text-[22px]",
  "report-more-button": "inline-flex h-[22px] w-[22px] items-center justify-center text-slate-400",
  "report-result-shell":
    "grid min-h-0 w-full grid-rows-[1fr_auto] overflow-hidden rounded-2xl border border-slate-200 bg-white",
  "report-table-scroll": "min-h-0 max-h-[420px] overflow-auto",
  "report-table":
    "w-full border-collapse [&_thead_th]:bg-slate-100 [&_thead_th]:text-[0.86rem] [&_thead_th]:font-semibold [&_thead_th]:normal-case [&_thead_th]:tracking-normal [&_thead_th]:text-slate-600 [&_tbody_td]:text-[1.08rem] [&_tbody_td]:text-slate-800 [&_tbody_tr:nth-child(odd)]:bg-transparent [&_tbody_tr]:border-t [&_tbody_tr]:border-slate-200",
  "report-table-footer":
    "flex items-center justify-end gap-6 border-t border-slate-200 bg-white px-4 py-3 text-slate-700",
  "report-table-footer-meta": "inline-flex items-center gap-2 text-[0.95rem] [&_strong]:font-semibold",
  "report-table-footer-select":
    "min-h-[34px] w-[86px] rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[0.95rem] text-slate-700",
  "report-table-pager":
    "inline-flex items-center gap-2 [&_button]:inline-flex [&_button]:h-8 [&_button]:w-8 [&_button]:items-center [&_button]:justify-center [&_button]:rounded-md [&_button]:text-xl [&_button]:leading-none [&_button]:text-slate-700 [&_button:disabled]:opacity-40",
  "graph-empty": "w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-600",
  "graph-stage": "grid min-h-0 w-full grid-rows-[auto_1fr_auto] gap-3",
  "graph-toolbar":
    "flex items-center justify-between [&_span]:inline-flex [&_span]:items-center [&_span]:rounded-full [&_span]:border [&_span]:border-slate-200 [&_span]:bg-slate-50 [&_span]:px-2.5 [&_span]:py-1 [&_span]:text-[11px] [&_span]:uppercase [&_span]:tracking-[0.08em] [&_span]:text-slate-600",
  "graph-canvas": "min-h-[180px] rounded-2xl border border-slate-200 bg-white",
  "graph-inspector": "grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4",
  "inspector-title": "text-xs font-extrabold uppercase tracking-[0.16em] text-blue-700",
  "inspector-main": "font-[var(--font-display)]",
  "inspector-properties": "grid gap-2",
  "property-row":
    "grid grid-cols-[minmax(0,1fr)_auto] gap-2.5 border-t border-slate-200 pt-2 [&_span]:text-slate-500",
  "property-empty": "text-slate-500",
};

export function tw(...inputs) {
  return clsx(inputs)
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => TOKENS[token] ?? token)
    .filter(Boolean)
    .join(" ");
}
