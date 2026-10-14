/**
 * The page's stylesheet, built from DSH design tokens so it follows the host
 * theme (light and dark) and sits next to the host's own settings pages.
 * Every token has a fallback for hosts that predate it.
 *
 * Layout: one column (at most 780px) with a header, three tabs, and panels;
 * editing and the export open in a drawer from the right.
 *
 * @module dsh-mcp-console/client-style
 */

const fg1 = 'var(--dsw-alias-label-primary,#1c1c22)'
const fg2 = 'var(--dsw-alias-label-secondary,#4a4a55)'
const fg3 = 'var(--dsw-alias-label-tertiary,#8a8a96)'
const fg4 = 'var(--dsw-alias-label-caption,#a0a0ab)'
const line = 'var(--dsw-alias-border-l4,rgba(127,127,127,.18))'
const lineStrong = 'var(--dsw-alias-border-l3,rgba(127,127,127,.3))'
const divider = 'var(--dsw-alias-border-l2,rgba(127,127,127,.14))'
const card = 'var(--dsw-alias-settings-card-fill,var(--dsw-alias-bg-layer-2,#fff))'
const cardLine = 'var(--dsw-alias-settings-card-stroke,var(--dsw-alias-border-l4,rgba(127,127,127,.2)))'
const field = 'var(--dsw-alias-bg-layer-1,rgba(127,127,127,.06))'
const hover = 'var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.08))'
const active = 'var(--dsw-alias-interactive-bg-active,rgba(127,127,127,.14))'
const accent = 'var(--dsw-alias-state-business-primary,#3964fe)'
const accentSoft = 'var(--dsw-alias-state-business-tertiary,rgba(57,100,254,.1))'
const ok = 'var(--dsw-alias-state-success-primary,#1f9d55)'
const okSoft = 'var(--dsw-alias-state-success-tertiary,rgba(31,157,85,.12))'
const warn = 'var(--dsw-alias-state-warn-label,#c7771a)'
const warnDot = 'var(--dsw-alias-state-warn-primary,#e8a33d)'
const warnSoft = 'var(--dsw-alias-state-warn-tertiary,rgba(199,119,26,.12))'
const bad = 'var(--dsw-alias-state-error-primary,#e03131)'
const badSoft = 'var(--dsw-alias-interactive-bg-hover-danger,rgba(224,49,49,.1))'
const idle = 'var(--dsw-alias-state-idle-primary,#a0a0ab)'
const mono = 'var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace)'
const rSm = 'var(--dsw-radius-sm,8px)'
const rMd = 'var(--dsw-radius-md,12px)'
const rXl = 'var(--dsw-radius-xl,16px)'

export const STYLE = `
.mcpc-page{box-sizing:border-box;height:100%;overflow:auto;padding:28px 24px 64px}
.mcpc{display:flex;flex-direction:column;gap:16px;max-width:780px;margin:0 auto;color:${fg1};font-size:14px;line-height:22px}
.mcpc *{box-sizing:border-box}
.mcpc-sp{flex:1}
.mcpc-muted{color:${fg3};font-size:12px;line-height:18px}
.mcpc-muted[data-mono=true],.mcpc-mono{font-family:${mono};font-size:11.5px;word-break:break-all}
.mcpc-note{margin:0;color:${fg3};font-size:12px;line-height:18px}
.mcpc-note[data-tone=warn],.mcpc-hint[data-tone=warn]{color:${warn}}
.mcpc-note[data-tone=bad],.mcpc-hint[data-tone=bad]{color:${bad}}
.mcpc-note[data-tone=ok]{color:${ok}}
.mcpc-pad{padding:0 16px 10px}
.mcpc-link{color:${accent};font-size:12px;text-decoration:none;word-break:break-all}
.mcpc-link:hover{text-decoration:underline}
.mcpc-actions{display:flex;flex-wrap:wrap;align-items:center;gap:8px}

/* header and tabs */
.mcpc-head{display:flex;flex-wrap:wrap;align-items:flex-start;gap:12px}
.mcpc-h1{margin:0;font-size:20px;font-weight:650;line-height:28px}
.mcpc-sub{margin:2px 0 0;max-width:60ch;color:${fg3};font-size:12px;line-height:18px}
.mcpc-banner{margin:0;padding:8px 12px;border-radius:${rMd};background:${warnSoft};color:${warn};font-size:12px;line-height:18px}
.mcpc-tabs{display:flex;align-self:flex-start;gap:2px;padding:3px;border:.5px solid ${line};border-radius:${rMd};background:${hover}}
.mcpc-tab{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 14px;border:0;border-radius:calc(${rMd} - 3px);background:transparent;color:${fg2};font:inherit;font-size:13px;cursor:pointer}
.mcpc-tab:hover{color:${fg1}}
.mcpc-tab[aria-selected=true]{background:var(--dsw-alias-button-elevated-fill,#fff);color:${fg1};font-weight:600;box-shadow:var(--dsw-shadow-lv1,0 1px 2px rgba(0,0,0,.08))}
.mcpc-count{min-width:18px;padding:0 6px;border-radius:999px;background:${hover};color:${fg3};font-size:11px;line-height:18px;text-align:center;font-variant-numeric:tabular-nums}
.mcpc-count[data-tone=bad]{background:${badSoft};color:${bad}}

/* buttons */
.mcpc-btn{display:inline-flex;flex:none;align-items:center;justify-content:center;gap:6px;height:28px;padding:0 10px;border:.5px solid ${lineStrong};border-radius:${rSm};background:transparent;color:${fg1};font:inherit;font-size:12.5px;line-height:18px;white-space:nowrap;cursor:pointer}
.mcpc-btn:hover:not(:disabled){background:${hover}}
.mcpc-btn:active:not(:disabled){background:${active}}
.mcpc-btn:disabled{opacity:.42;cursor:not-allowed}
.mcpc-btn[data-size=md]{height:32px;padding:0 14px;border-radius:10px;font-size:13px}
.mcpc-btn[data-variant=primary]{border-color:transparent;background:var(--dsw-alias-button-primary-fill,${accent});color:var(--dsw-alias-label-primary-foreground,#fff)}
.mcpc-btn[data-variant=primary]:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover,${accent})}
.mcpc-btn[data-variant=ghost]{border-color:transparent;color:${fg2}}
.mcpc-btn[data-variant=icon]{width:28px;padding:0;border-color:transparent;color:${fg3}}
.mcpc-btn[data-variant=icon]:hover:not(:disabled){color:${fg1}}
.mcpc-btn[data-variant=danger-solid]{border-color:transparent;background:${bad};color:#fff}
.mcpc-textbtn{padding:0;border:0;background:none;color:${accent};font:inherit;font-size:12px;cursor:pointer}
.mcpc-textbtn:disabled{color:${fg4};cursor:default}
.mcpc-btn:focus-visible,.mcpc-tab:focus-visible,.mcpc-row-main:focus-visible,.mcpc-src:focus-visible,.mcpc-switch:focus-visible,.mcpc-textbtn:focus-visible{outline:2px solid ${accent};outline-offset:2px}

/* panels */
.mcpc-panel{border:.5px solid ${cardLine};border-radius:${rXl};background:${card}}
.mcpc-panel-head{display:flex;flex-wrap:wrap;align-items:center;gap:10px;min-height:52px;padding:12px 16px 8px}
.mcpc-panel-title{margin:0;font-size:14px;font-weight:600;line-height:22px}
.mcpc-panel-body{display:flex;flex-direction:column;gap:12px;padding:0 16px 16px}
.mcpc-empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:40px 16px;text-align:center}
.mcpc-empty[data-compact=true]{padding:16px}
.mcpc-empty .mcpc-note{max-width:48ch}

/* status */
.mcpc-dot{flex:none;width:8px;height:8px;border-radius:50%}
.mcpc-dot[data-tone=ok]{background:${ok};box-shadow:0 0 0 3px ${okSoft}}
.mcpc-dot[data-tone=bad]{background:${bad};box-shadow:0 0 0 3px ${badSoft}}
.mcpc-dot[data-tone=wait]{background:${warnDot};box-shadow:0 0 0 3px ${warnSoft};animation:mcpc-pulse 1.4s ease-in-out infinite}
.mcpc-dot[data-tone=off]{border:1.5px solid ${idle}}
@keyframes mcpc-pulse{50%{opacity:.35}}
.mcpc-tag{display:inline-flex;flex:none;align-items:center;height:20px;padding:0 6px;border:.5px solid ${lineStrong};border-radius:var(--dsw-radius-xs,5px);color:${fg2};font-family:${mono};font-size:11px;line-height:18px;white-space:nowrap}
.mcpc-tag[data-soft=true]{border-color:transparent;background:${hover}}
.mcpc-tag[data-sans=true]{font-family:inherit}
.mcpc-tags{display:flex;flex-wrap:wrap;gap:4px}
.mcpc-chip{display:inline-flex;flex:none;align-items:center;height:20px;padding:0 8px;border-radius:999px;font-size:11px;font-weight:500;white-space:nowrap}
.mcpc-chip[data-tone=ok]{background:${okSoft};color:${ok}}
.mcpc-chip[data-tone=bad]{background:${badSoft};color:${bad}}
.mcpc-chip[data-tone=warn]{background:${warnSoft};color:${warn}}
.mcpc-chip[data-tone=info]{background:${accentSoft};color:${accent}}
.mcpc-chip[data-tone=idle]{background:${hover};color:${fg3}}
.mcpc-switch{position:relative;flex:none;width:34px;height:20px;padding:0;border:0;border-radius:999px;background:${lineStrong};cursor:pointer;transition:background .15s}
.mcpc-switch::after{content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
.mcpc-switch[aria-checked=true]{background:${accent}}
.mcpc-switch[aria-checked=true]::after{transform:translateX(14px)}
.mcpc-switch:disabled{opacity:.42;cursor:not-allowed}
.mcpc-spinner{display:inline-block;flex:none;width:13px;height:13px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:mcpc-spin .7s linear infinite}
@keyframes mcpc-spin{to{transform:rotate(360deg)}}

/* installed */
.mcpc-summary{display:flex;flex-wrap:wrap;gap:6px 18px;padding:0 16px 12px;color:${fg3};font-size:12px}
.mcpc-summary b{margin-right:3px;color:${fg1};font-weight:600;font-variant-numeric:tabular-nums}
.mcpc-summary [data-tone=bad],.mcpc-summary [data-tone=bad] b{color:${bad}}
.mcpc-list{border-top:.5px solid ${divider}}
.mcpc-row{border-bottom:.5px solid ${divider}}
.mcpc-row:last-child{border-bottom:0}
.mcpc-row-line{display:flex;align-items:center;gap:8px;padding:8px 10px 8px 16px}
.mcpc-row-main{display:flex;flex:1;align-items:center;gap:10px;min-width:0;padding:4px 0;border:0;border-radius:6px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}
.mcpc-row-name{font-weight:600;white-space:nowrap}
.mcpc-row-meta{flex:1;min-width:0;overflow:hidden;color:${fg3};font-size:12px;white-space:nowrap;text-overflow:ellipsis}
.mcpc-row-meta[data-tone=bad]{color:${bad}}
.mcpc-row-caret{display:inline-flex;flex:none;color:${fg3};transition:transform .15s}
.mcpc-row[data-open=true] .mcpc-row-caret{transform:rotate(90deg)}
.mcpc-row-detail{display:flex;flex-direction:column;gap:10px;padding:0 16px 14px 34px}
.mcpc-kv{display:grid;grid-template-columns:76px minmax(0,1fr);gap:6px 12px;margin:0;font-size:12px;line-height:20px}
.mcpc-kv>dt{color:${fg3}}
.mcpc-kv>dd{min-width:0;margin:0;color:${fg2};word-break:break-all}
.mcpc-err{margin:0;padding:8px 10px;border-radius:${rSm};background:${badSoft};color:${bad};font-family:${mono};font-size:11.5px;line-height:18px;white-space:pre-wrap;word-break:break-all;max-height:200px;overflow:auto}
.mcpc-confirm{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;border-radius:${rSm};background:${badSoft};font-size:12px;line-height:18px}
.mcpc-inline-form{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.mcpc-inline-form .mcpc-input{flex:1 1 220px;width:auto}
.mcpc-menu-wrap{position:relative}
.mcpc-menu{position:absolute;top:32px;right:0;z-index:5;min-width:168px;padding:4px;border:.5px solid ${line};border-radius:${rMd};background:var(--dsw-alias-bg-layer-2,#fff);box-shadow:var(--dsw-shadow-lv2,0 8px 24px rgba(0,0,0,.14))}
.mcpc-menu button{display:flex;align-items:center;width:100%;height:32px;padding:0 10px;border:0;border-radius:8px;background:transparent;color:${fg1};font:inherit;font-size:13px;text-align:left;cursor:pointer}
.mcpc-menu button:hover{background:${hover}}
.mcpc-menu button[data-danger=true]{color:${bad}}
.mcpc-menu hr{margin:4px 2px;border:0;border-top:.5px solid ${divider}}

/* add */
.mcpc-sources{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding:0 16px 16px}
.mcpc-src{display:flex;flex-direction:column;align-items:flex-start;gap:6px;padding:12px;border:.5px solid ${line};border-radius:${rMd};background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}
.mcpc-src:hover{border-color:${lineStrong};background:${hover}}
.mcpc-src[aria-pressed=true]{border-color:${accent};background:${accentSoft}}
.mcpc-src>svg{color:${accent}}
.mcpc-src>b{font-size:13px;font-weight:600}
.mcpc-src>span{color:${fg3};font-size:12px;line-height:17px}
.mcpc-step{display:flex;flex-direction:column;gap:14px;padding:16px;border-top:.5px solid ${divider}}
.mcpc-crumb{display:flex;flex-wrap:wrap;align-items:center;gap:6px;color:${fg3};font-size:12px}
.mcpc-search{display:flex;gap:8px}
.mcpc-search .mcpc-input{flex:1}
.mcpc-results{display:flex;flex-direction:column;gap:8px}
.mcpc-res{display:flex;flex-direction:column;gap:6px;padding:12px;border:.5px solid ${line};border-radius:${rMd}}
.mcpc-res-top{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 8px}
.mcpc-res-top b{font-size:13.5px}
.mcpc-opt{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px;padding-top:8px;border-top:.5px solid ${divider}}
.mcpc-opt code,.mcpc-imp code{overflow:hidden;color:${fg2};font-family:${mono};font-size:11.5px;line-height:18px;white-space:nowrap;text-overflow:ellipsis}
.mcpc-imports{display:flex;flex-direction:column;gap:6px}
.mcpc-imp{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px;padding:10px 12px;border:.5px solid ${line};border-radius:${rMd};cursor:pointer}
.mcpc-imp:hover{background:${hover}}
.mcpc-imp[data-disabled=true]{cursor:default;opacity:.8}
.mcpc-imp input{margin:0;accent-color:${accent}}
.mcpc-imp-main{display:flex;flex-direction:column;gap:2px;min-width:0}
.mcpc-imp code{color:${fg3}}
.mcpc-imp-title{display:flex;flex-wrap:wrap;align-items:center;gap:6px}

/* form */
.mcpc-form{display:flex;flex-direction:column;gap:14px;min-width:0}
.mcpc-field{display:flex;flex-direction:column;gap:5px;min-width:0}
.mcpc-label{color:${fg2};font-size:12px;font-weight:500;line-height:18px}
.mcpc-hint{color:${fg3};font-size:12px;line-height:18px}
.mcpc-input{width:100%;min-width:0;height:32px;padding:0 10px;border:.5px solid ${lineStrong};border-radius:${rSm};background:${field};color:${fg1};font:inherit;font-size:13px;outline:none}
.mcpc-input:focus{border-color:${accent}}
.mcpc-input::placeholder{color:${fg4}}
.mcpc-input:disabled{opacity:.55}
.mcpc-input[data-mono=true]{font-family:${mono};font-size:12.5px}
.mcpc-input[data-multiline=true]{height:auto;min-height:64px;padding:8px 10px;line-height:1.55;resize:vertical}
.mcpc-input[data-select=true]{flex:0 1 240px;width:auto;cursor:pointer}
.mcpc-seg{display:inline-flex;align-self:flex-start;gap:2px;padding:2px;border:.5px solid ${line};border-radius:10px;background:${hover}}
.mcpc-seg>button{height:28px;padding:0 12px;border:0;border-radius:8px;background:transparent;color:${fg2};font:inherit;font-size:12.5px;cursor:pointer}
.mcpc-seg>button[aria-checked=true]{background:var(--dsw-alias-button-elevated-fill,#fff);color:${fg1};font-weight:600;box-shadow:var(--dsw-shadow-lv1,0 1px 2px rgba(0,0,0,.08))}
.mcpc-seg>button:disabled{cursor:not-allowed}
.mcpc-pairs{display:flex;flex-direction:column;gap:6px}
.mcpc-pair-wrap{display:flex;flex-direction:column;gap:3px}
.mcpc-pair{display:grid;grid-template-columns:minmax(0,170px) minmax(0,1fr) auto auto;align-items:center;gap:6px}
.mcpc-pair .mcpc-input{height:30px}
.mcpc-expr{display:flex;align-items:center;overflow:hidden;color:${fg3};font-family:${mono};font-size:12px;white-space:nowrap;text-overflow:ellipsis;cursor:default}
.mcpc-check{display:inline-flex;align-items:center;gap:6px;color:${fg2};font-size:12px;line-height:18px;cursor:pointer}
.mcpc-check input{flex:none;margin:0;accent-color:${accent}}
.mcpc-adv{border:.5px solid ${line};border-radius:${rMd}}
.mcpc-adv>summary{display:flex;align-items:center;gap:8px;padding:9px 12px;color:${fg2};font-size:12.5px;cursor:pointer;list-style:none}
.mcpc-adv>summary::-webkit-details-marker{display:none}
.mcpc-adv>summary::before{content:'›';color:${fg3};transition:transform .15s}
.mcpc-adv[open]>summary::before{transform:rotate(90deg)}
.mcpc-adv>div{display:flex;flex-direction:column;gap:8px;padding:2px 12px 12px}
.mcpc-result{display:flex;flex-direction:column;gap:8px;padding:12px;border-radius:${rMd};font-size:13px;line-height:20px}
.mcpc-result[data-tone=ok]{background:${okSoft}}
.mcpc-result[data-tone=bad]{background:${badSoft}}
.mcpc-result[data-tone=info]{background:${accentSoft};font-size:12.5px}
.mcpc-result-title{display:flex;align-items:center;gap:8px;font-weight:600}
.mcpc-result[data-tone=ok] .mcpc-result-title{color:${ok}}
.mcpc-result[data-tone=bad] .mcpc-result-title{color:${bad}}

/* discover */
.mcpc-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding:0 16px 12px}
.mcpc-stat{display:flex;flex-direction:column;padding:10px 12px;border-radius:${rMd};background:${hover}}
.mcpc-stat b{font-size:20px;font-weight:600;line-height:28px;font-variant-numeric:tabular-nums}
.mcpc-stat span{color:${fg3};font-size:12px}
.mcpc-runtimes{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:0 16px 14px}
.mcpc-group{border-top:.5px solid ${divider}}
.mcpc-group>summary{display:flex;align-items:center;gap:8px;min-height:44px;padding:6px 16px;font-size:13px;cursor:pointer;list-style:none}
.mcpc-group>summary::-webkit-details-marker{display:none}
.mcpc-group>summary::before{content:'›';color:${fg3};transition:transform .15s}
.mcpc-group[open]>summary::before{transform:rotate(90deg)}
.mcpc-group ul{margin:0;padding:0 16px 12px 34px;max-height:240px;overflow:auto;columns:2;column-gap:24px;color:${fg2};font-size:12px;line-height:22px}
.mcpc-group li{break-inside:avoid}

/* drawer and toast */
.mcpc-scrim{position:fixed;inset:0;z-index:40;background:var(--dsw-alias-bg-mask-1,rgba(10,10,20,.32))}
.mcpc-drawer{position:fixed;top:0;right:0;bottom:0;z-index:41;display:flex;flex-direction:column;width:min(540px,100%);background:var(--dsw-alias-bg-layer-2,#fff);color:${fg1};font-size:14px;line-height:22px;box-shadow:var(--dsw-shadow-lv3,0 12px 40px rgba(0,0,0,.2))}
.mcpc-drawer *{box-sizing:border-box}
.mcpc-drawer-head{display:flex;align-items:center;gap:10px;padding:14px 16px 14px 20px;border-bottom:.5px solid ${divider}}
.mcpc-drawer-body{display:flex;flex:1;flex-direction:column;gap:14px;overflow:auto;padding:16px 20px}
.mcpc-drawer-foot{padding:12px 20px;border-top:.5px solid ${divider}}
.mcpc-notes{margin:0;padding-left:18px;color:${fg2};font-size:12px;line-height:18px}
.mcpc-toast{position:fixed;bottom:24px;left:50%;z-index:50;transform:translateX(-50%);max-width:min(560px,calc(100% - 32px));padding:8px 14px;border-radius:10px;background:${fg1};color:var(--dsw-alias-label-primary-inverted,#fff);font-size:13px;line-height:20px;box-shadow:var(--dsw-shadow-lv2,0 8px 24px rgba(0,0,0,.14))}

@media (prefers-reduced-motion:reduce){.mcpc-dot[data-tone=wait],.mcpc-spinner{animation:none}}
@media (max-width:640px){
.mcpc-page{padding:20px 16px 48px}
.mcpc-sources,.mcpc-stats{grid-template-columns:repeat(2,minmax(0,1fr))}
.mcpc-pair{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
.mcpc-group ul{columns:1}
.mcpc-row-meta{display:none}
}
`
