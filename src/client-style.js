/**
 * The settings panel's stylesheet, built only from DSH design tokens so it
 * follows the host theme (light and dark) and matches the host's own settings
 * pages: settings cards, hairline-divided rows, 0.5px tags, layer-1 inputs.
 * Fallbacks cover hosts that predate the settings-card tokens.
 *
 * @module dsh-mcp-console/client-style
 */

export const STYLE = `
.mcpc{display:flex;flex-direction:column;gap:16px;color:var(--dsw-alias-label-primary);font-size:14px;line-height:22px}
.mcpc-intro{margin:0;color:var(--dsw-alias-label-tertiary)}
.mcpc-card{display:flex;flex-direction:column;gap:14px;padding:16px 18px;border:.5px solid var(--dsw-alias-settings-card-stroke,var(--dsw-alias-border-l4,rgba(127,127,127,.3)));border-radius:var(--dsw-radius-xl,20px);background:var(--dsw-alias-settings-card-fill,var(--dsw-alias-bg-layer-2))}
.mcpc-head{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:28px}
.mcpc-title{display:flex;align-items:center;gap:8px;margin:0;font-size:15px;font-weight:600;line-height:22px}
.mcpc-note{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.mcpc-warn{margin:0;color:var(--dsw-alias-state-warn-label,#dd8629);font-size:12px;line-height:18px}
.mcpc-error{margin:0;color:var(--dsw-alias-state-error-primary,#ec1313);font-size:12px;line-height:18px}
.mcpc-label{color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:500;line-height:18px}
.mcpc-mono{font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:12px;word-break:break-all}
.mcpc-detail{margin:0;padding:8px 10px;border-radius:var(--dsw-radius-sm,8px);background:var(--dsw-alias-markdown-code-block);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;white-space:pre-wrap;word-break:break-all;max-height:160px;overflow:auto}

.mcpc-btn{box-sizing:border-box;display:inline-flex;flex:none;align-items:center;justify-content:center;gap:4px;height:28px;padding:0 10px;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-sm,8px);background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;line-height:18px;white-space:nowrap;cursor:pointer}
.mcpc-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.mcpc-btn:active:not(:disabled){background:var(--dsw-alias-interactive-bg-active)}
.mcpc-btn:disabled{opacity:.4;cursor:not-allowed}
.mcpc-btn[data-size=md]{height:32px;padding:0 14px;border-radius:var(--dsw-radius-md,12px);font-size:13px}
.mcpc-btn[data-variant=primary]{border-color:transparent;background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}
.mcpc-btn[data-variant=primary]:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}
.mcpc-btn[data-variant=ghost]{border-color:transparent;color:var(--dsw-alias-label-secondary)}
.mcpc-btn[data-variant=danger]{border-color:transparent;color:var(--dsw-alias-state-error-primary)}
.mcpc-btn[data-variant=danger]:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-danger)}

.mcpc-input{box-sizing:border-box;flex:1 1 200px;min-width:0;height:32px;padding:0 10px;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-md,12px);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;outline:none}
.mcpc-input:focus{border-color:var(--dsw-alias-state-business-primary)}
.mcpc-input::placeholder{color:var(--dsw-alias-label-caption)}
.mcpc-input:disabled{opacity:.5}
.mcpc-link{color:var(--dsw-alias-state-business-primary);font-size:12px;text-decoration:none}
.mcpc-link:hover{text-decoration:underline}
.mcpc-textarea{display:block;width:100%;height:auto;min-height:96px;padding:8px 10px;line-height:1.6;resize:vertical;white-space:pre;overflow-x:auto}
.mcpc-form{display:flex;flex-wrap:wrap;align-items:center;gap:8px}

.mcpc-chip{flex:none;padding:0 8px;border-radius:999px;font-size:11px;font-weight:500;line-height:18px;white-space:nowrap}
.mcpc-chip[data-tone=success]{background:var(--dsw-alias-state-success-tertiary);color:var(--dsw-alias-state-success-primary)}
.mcpc-chip[data-tone=danger]{background:var(--dsw-alias-interactive-bg-hover-danger);color:var(--dsw-alias-state-error-primary)}
.mcpc-chip[data-tone=info]{background:var(--dsw-alias-state-business-tertiary);color:var(--dsw-alias-state-business-primary)}
.mcpc-chip[data-tone=neutral]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}
.mcpc-tag{flex:none;padding:0 6px;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-xs,4px);color:var(--dsw-alias-label-secondary);font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:11px;line-height:18px;cursor:default}
.mcpc-dot{flex:none;width:8px;height:8px;border-radius:50%;background:var(--dsw-alias-state-idle-primary)}
.mcpc-dot[data-tone=success]{background:var(--dsw-alias-state-success-primary)}
.mcpc-dot[data-tone=warn]{background:var(--dsw-alias-state-warn-primary)}
.mcpc-dot[data-tone=danger]{background:var(--dsw-alias-state-error-primary)}

.mcpc-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.mcpc-stat{display:flex;flex-direction:column;gap:2px;padding:10px 12px;border-radius:var(--dsw-radius-md,12px);background:var(--dsw-alias-interactive-bg-hover)}
.mcpc-stat-label{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.mcpc-stat-value{font-size:20px;font-weight:600;line-height:28px;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

.mcpc-list{display:flex;flex-direction:column}
.mcpc-row{display:flex;flex-direction:column;gap:8px;padding:12px 0;border-top:.5px solid var(--dsw-alias-border-l2)}
.mcpc-row:first-child{border-top:0;padding-top:2px}
.mcpc-row-top{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 12px}
.mcpc-row-name{display:flex;flex-wrap:wrap;align-items:center;gap:8px;min-width:0;font-weight:500}
.mcpc-row-name>.mcpc-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mcpc-actions{display:flex;flex-wrap:wrap;gap:4px}
.mcpc-meta{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;font-variant-numeric:tabular-nums}
.mcpc-figures{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 16px;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.mcpc-figures b{margin-left:4px;color:var(--dsw-alias-label-primary);font-size:13px;font-weight:600;font-variant-numeric:tabular-nums}
.mcpc-bar{height:4px;overflow:hidden;border-radius:999px;background:var(--dsw-alias-interactive-bg-active)}
.mcpc-bar>span{display:block;height:100%;border-radius:inherit;background:var(--dsw-alias-state-success-primary)}
.mcpc-bar[data-level=warn]>span{background:var(--dsw-alias-state-warn-primary)}
.mcpc-bar[data-level=low]>span{background:var(--dsw-alias-state-error-primary)}
.mcpc-groups{display:flex;flex-wrap:wrap;align-items:center;gap:6px 6px}
.mcpc-groups>.mcpc-label{margin-right:2px}
.mcpc-reach{display:flex;flex-wrap:wrap;align-items:center;gap:4px 12px;font-size:12px;line-height:18px}
.mcpc-reach>span{display:inline-flex;align-items:center;gap:4px;cursor:default}
.mcpc-reach>span[data-state=ok]{color:var(--dsw-alias-state-success-primary)}
.mcpc-reach>span[data-state=partial]{color:var(--dsw-alias-state-warn-label,#dd8629)}
.mcpc-reach>span[data-state=no]{color:var(--dsw-alias-label-caption);text-decoration:line-through}
.mcpc-add{display:flex;flex-direction:column;gap:8px;padding-top:14px;border-top:.5px solid var(--dsw-alias-border-l2)}

.mcpc-models{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:0;padding:0;min-width:0;border:0}
.mcpc-model{display:flex;align-items:center;gap:10px;min-width:0;padding:10px 12px;border-radius:var(--dsw-radius-md,12px);background:var(--dsw-alias-interactive-bg-hover);cursor:pointer}
.mcpc-model>input{flex:none;width:16px;height:16px;margin:0;accent-color:var(--dsw-alias-state-business-primary)}
.mcpc-model>span{display:flex;flex-direction:column;min-width:0;gap:2px}
.mcpc-model b{font-size:13px;font-weight:500}
.mcpc-models:disabled .mcpc-model{opacity:.5;cursor:not-allowed}

.mcpc-setting{display:grid;grid-template-columns:112px minmax(0,1fr);gap:6px 16px;align-items:start}
.mcpc-setting>.mcpc-label{padding-top:5px}
.mcpc-setting>div{display:flex;flex-direction:column;gap:6px;min-width:0}
.mcpc-seg{display:inline-flex;flex-wrap:wrap;align-self:flex-start;gap:2px;max-width:100%;padding:2px;border-radius:var(--dsw-radius-md,12px);background:var(--dsw-alias-interactive-bg-hover)}
.mcpc-seg>button{height:28px;padding:0 12px;border:0;border-radius:calc(var(--dsw-radius-md,12px) - 2px);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;line-height:18px;cursor:pointer}
.mcpc-seg>button:hover:not(:disabled):not([aria-checked=true]){color:var(--dsw-alias-label-primary)}
.mcpc-seg>button[aria-checked=true]{background:var(--dsw-alias-button-elevated-fill);color:var(--dsw-alias-label-primary);font-weight:500;box-shadow:var(--dsw-shadow-lv1)}
.mcpc-seg>button:disabled{cursor:not-allowed;opacity:.5}
.mcpc-status{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;font-size:13px}
.mcpc-status>b{font-weight:600;font-variant-numeric:tabular-nums}
.mcpc-callout{display:flex;flex-direction:column;gap:10px;padding:12px 14px;border-radius:var(--dsw-radius-md,12px);background:var(--dsw-alias-state-warn-tertiary)}
.mcpc-callout[data-tone=info]{background:var(--dsw-alias-state-business-tertiary)}
.mcpc-callout[data-tone=danger]{background:var(--dsw-alias-interactive-bg-hover-danger);color:var(--dsw-alias-label-primary)}
.mcpc-callout>.mcpc-title{font-size:13px}
.mcpc-split{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px}

.mcpc-advanced>summary{width:fit-content;padding:2px 4px;margin-left:-4px;border-radius:var(--dsw-radius-sm,8px);color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:500;line-height:18px;cursor:pointer}
.mcpc-advanced>summary:hover{background:var(--dsw-alias-interactive-bg-hover)}
.mcpc-advanced[open]>summary{margin-bottom:10px}
.mcpc-field{display:flex;flex-direction:column;gap:4px;margin-bottom:10px}
.mcpc-field>.mcpc-input,.mcpc-field>.mcpc-textarea{flex:none;width:100%}

.mcpc-composer{display:inline-flex;flex:0 0 auto;align-items:center;box-sizing:border-box;height:28px;color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:500;line-height:20px;font-variant-numeric:tabular-nums;white-space:nowrap;user-select:none}

@media (max-width:640px){
  .mcpc-stats{grid-template-columns:1fr}
  .mcpc-setting{grid-template-columns:1fr}
  .mcpc-models{grid-template-columns:1fr}
  .mcpc-setting>.mcpc-label{padding-top:0}
}

.mcpc-page{box-sizing:border-box;height:100%;overflow:auto;padding:28px 24px 48px}
.mcpc-page>.mcpc{max-width:960px;margin:0 auto}
.mcpc-header{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:12px}
.mcpc-h1{margin:0;color:var(--dsw-alias-label-primary);font-size:20px;font-weight:600;line-height:28px}
.mcpc-server{display:flex;flex-direction:column;gap:8px;padding:12px 14px;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-md,12px)}
.mcpc-server[data-enabled=false]{opacity:.72}
.mcpc-server-top{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px}
.mcpc-server-name{display:inline-flex;flex-wrap:wrap;align-items:center;gap:8px;min-width:0;color:var(--dsw-alias-label-primary);font-size:14px;font-weight:600}
.mcpc-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 12px;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
.mcpc-kv>dt{color:var(--dsw-alias-label-tertiary)}
.mcpc-kv>dd{margin:0;min-width:0;word-break:break-all}
.mcpc-tags{display:flex;flex-wrap:wrap;gap:4px}
.mcpc-switch{position:relative;display:inline-flex;align-items:center;width:36px;height:20px;padding:0;border:0;border-radius:10px;background:var(--dsw-alias-border-l3);cursor:pointer;flex:none}
.mcpc-switch::after{content:'';position:absolute;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:left .15s}
.mcpc-switch[aria-checked=true]{background:var(--dsw-alias-state-success-primary)}
.mcpc-switch[aria-checked=true]::after{left:18px}
.mcpc-switch:disabled{opacity:.45;cursor:not-allowed}
.mcpc-textarea{box-sizing:border-box;width:100%;min-height:64px;padding:8px 10px;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-md,12px);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:1.5;resize:vertical;outline:none}
.mcpc-textarea:focus{border-color:var(--dsw-alias-state-business-primary)}
.mcpc-columns{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px}
.mcpc-group{display:flex;flex-direction:column;gap:4px;padding:10px 12px;border-radius:var(--dsw-radius-md,12px);background:var(--dsw-alias-interactive-bg-hover)}
.mcpc-group>ul{margin:0;padding-left:16px;max-height:180px;overflow:auto;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
.mcpc-link{color:var(--dsw-alias-state-business-primary);text-decoration:none;word-break:break-all}
.mcpc-link:hover{text-decoration:underline}
.mcpc-select{flex:1 1 180px;height:32px;padding:0 8px;cursor:pointer}
.mcpc-imports{display:flex;flex-direction:column;gap:8px}
.mcpc-imports>p{margin:-4px 0 2px}
.mcpc-imports-head{display:flex;align-items:baseline;gap:8px}
.mcpc-import-list{display:flex;flex-direction:column;gap:6px;margin:0;padding:0;list-style:none}
.mcpc-import-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;padding:10px 12px;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-md,12px);background:var(--dsw-alias-bg-layer-1)}
.mcpc-import-row:hover{border-color:var(--dsw-alias-border-l3)}
.mcpc-import-main{display:flex;flex-direction:column;gap:4px;min-width:0}
.mcpc-import-title{display:flex;flex-wrap:wrap;align-items:center;gap:6px;min-width:0}
.mcpc-import-name{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:600;line-height:20px}
.mcpc-import-cmd{overflow:hidden;color:var(--dsw-alias-label-tertiary);font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:11.5px;line-height:18px;white-space:nowrap;text-overflow:ellipsis}
.mcpc-import-action{display:flex;align-items:center;justify-content:flex-end}
.mcpc-tag-soft{border-color:transparent;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);font-family:inherit}
`
