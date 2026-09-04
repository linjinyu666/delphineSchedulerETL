import{d as J,D as _,g as d,a1 as I,c as o,z as t,F as E}from"./index.291055ec.js";import{u as j}from"./use-message.173ec8df.js";import{N as L,a as R}from"./DrawerContent.acedd3f7.js";import{N as T}from"./Tooltip.86d5680c.js";import{N as v}from"./Button.2b930b23.js";import"./index.64209708.js";import"./Scrollbar.c679a5ee.js";import"./VResizeObserver.4329b960.js";import"./use-false-until-truthy.c0107dd9.js";import"./use-is-composing.29ff64de.js";import"./is-browser.45c3bd93.js";import"./use-merged-state.b2e27208.js";import"./index.3ef69258.js";import"./call.00499c7e.js";import"./format-length.d7d829b3.js";import"./Popover.883534d5.js";import"./_baseMap.c2bb8872.js";import"./get.064e9aa7.js";import"./cssr.58e656e6.js";import"./utils.4d219de7.js";import"./resolve-slot.9ff69768.js";import"./use-compitable.5328878b.js";import"./get-first-slot-vnode.dd05f918.js";import"./flatten.0c1da1e2.js";import"./next-frame-once.e5ee25e8.js";import"./use-form-item.5072a1b6.js";const q=`
/* === FilterConfigDialog \xB7 Refined data-tool === */
.fcd-section {
  padding: 18px 24px;
  border-bottom: 1px solid #E7E5E0;
  position: relative;
}
.fcd-section.fcd-section-last { border-bottom: none; }

.fcd-section-num {
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 10px;
  color: #D6D3CD;
  letter-spacing: 0.1em;
  margin-bottom: 4px;
}
.fcd-section-title {
  font-size: 13px;
  font-weight: 600;
  color: #1C1917;
  letter-spacing: -0.01em;
}
.fcd-section-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.fcd-section-hint {
  font-size: 11px;
  color: #A8A29E;
  margin-top: 3px;
  margin-bottom: 12px;
}

/* alias row */
.fcd-alias-row {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #FAFAF9;
  border: 1px solid #E7E5E0;
  border-radius: 6px;
  padding: 0 10px;
  transition: all 0.15s;
}
.fcd-alias-row:focus-within {
  border-color: #0D9488;
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.08);
  background: #FFFFFF;
}
.fcd-alias-tag {
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 11px;
  color: #A8A29E;
  padding: 2px 6px;
  background: #EFEEEC;
  border-radius: 3px;
}
.fcd-alias-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 10px 0;
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 13px;
  color: #1C1917;
  outline: none;
}
.fcd-alias-input::placeholder { color: #D6D3CD; }
.fcd-alias-valid {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #0D9488;
  color: white;
  display: grid;
  place-items: center;
  font-size: 10px;
  font-weight: bold;
}
.fcd-alias-valid.bad { background: #B91C1C; }

/* map table */
.fcd-map-table {
  border: 1px solid #E7E5E0;
  border-radius: 6px;
  overflow: hidden;
  background: #FFFFFF;
}
.fcd-map-header {
  display: grid;
  grid-template-columns: 32px 1fr 14px 1fr 32px;
  gap: 0;
  padding: 8px 10px;
  background: #F5F5F4;
  border-bottom: 1px solid #E7E5E0;
  font-size: 10px;
  font-weight: 600;
  color: #57534E;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.fcd-map-row {
  display: grid;
  grid-template-columns: 32px 1fr 14px 1fr 32px;
  gap: 0;
  padding: 8px 10px;
  align-items: center;
  border-bottom: 1px solid #E7E5E0;
  transition: background 0.1s;
  position: relative;
}
.fcd-map-row:last-child { border-bottom: none; }
.fcd-map-row:hover { background: #FAFAF9; }
.fcd-map-row.has-conflict { background: #FEF2F2; }
/* \u4E0D\u52FE\u9009\uFF08disabled\uFF09= \u5B57\u6BB5\u53D8\u7070 + \u4E2D\u95F4\u6A2A\u7EBF */
.fcd-map-row.disabled { background: #FAFAF9; }
.fcd-map-row.disabled .fcd-map-field-src,
.fcd-map-row.disabled .fcd-map-field-dst,
.fcd-map-row.disabled .fcd-map-arrow {
  color: #A8A29E;
  text-decoration: line-through;
  text-decoration-color: #A8A29E;
  text-decoration-thickness: 1px;
}
.fcd-map-row.disabled .fcd-map-field-src {
  background: #EFEEEC;
}
.fcd-map-row.disabled .fcd-map-field-dst {
  background: transparent;
  cursor: not-allowed;
}
.fcd-map-row.disabled .fcd-map-checkbox {
  background: #FFFFFF;
  border-color: #D6D3CD;
}
.fcd-map-row.disabled .fcd-map-checkbox:not(.checked) {
  background: #FAFAF9;
}

.fcd-map-checkbox {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: 1.5px solid #D6D3CD;
  background: #FFFFFF;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: all 0.1s;
  color: white;
  font-size: 11px;
  line-height: 1;
}
.fcd-map-checkbox.checked {
  background: #0D9488;
  border-color: #0D9488;
}

.fcd-map-field-src {
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 12px;
  color: #1C1917;
  padding: 4px 8px;
  background: #F5F5F4;
  border-radius: 4px;
}

.fcd-map-arrow {
  text-align: center;
  color: #D6D3CD;
  font-size: 12px;
}

.fcd-map-dst-wrap {
  position: relative;
  width: 100%;
}
.fcd-map-field-dst {
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 12px;
  color: #1C1917;
  padding: 4px 8px;
  background: #FFFFFF;
  border-radius: 4px;
  border: 1px solid #E7E5E0;
  width: 100%;
  outline: none;
  transition: all 0.1s;
  box-sizing: border-box;
}
.fcd-map-field-dst:focus {
  border-color: #0D9488;
  box-shadow: 0 0 0 2px rgba(13, 148, 136, 0.08);
}
.fcd-map-field-dst.error {
  border-color: #B91C1C;
  background: #FEF2F2;
}
.fcd-map-field-dst.error::placeholder {
  color: #B91C1C;
  opacity: 0.7;
}
.fcd-conflict-badge {
  position: absolute;
  top: -6px;
  right: -4px;
  background: #B91C1C;
  color: white;
  font-size: 9px;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 8px;
  line-height: 1.4;
  box-shadow: 0 0 0 2px #FFFFFF;
  pointer-events: none;
}

.fcd-map-remove {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  background: transparent;
  border: none;
  color: #A8A29E;
  cursor: pointer;
  display: grid;
  place-items: center;
  opacity: 0;
  transition: all 0.15s;
  font-size: 14px;
}
.fcd-map-row:hover .fcd-map-remove { opacity: 1; }
.fcd-map-remove:hover {
  background: #FEF2F2;
  color: #B91C1C;
}

.fcd-map-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
.fcd-action-link {
  font-size: 11px;
  color: #0D9488;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  transition: background 0.1s;
  font-weight: 500;
}
.fcd-action-link:hover { background: #CCFBF1; }
.fcd-action-link.muted { color: #A8A29E; }
.fcd-action-link.muted:hover {
  background: #F5F5F4;
  color: #57534E;
}
.fcd-map-count {
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 10px;
  color: #A8A29E;
  padding: 2px 6px;
  background: #F5F5F4;
  border-radius: 3px;
}

.fcd-empty-hint {
  font-size: 12px;
  color: #A8A29E;
  padding: 14px 12px;
  background: #FAFAF9;
  border: 1px dashed #E7E5E0;
  border-radius: 6px;
  text-align: center;
}

/* WHERE shell */
.fcd-where-shell {
  border: 1px solid #E7E5E0;
  border-radius: 6px;
  background: #FFFFFF;
  overflow: hidden;
  transition: border 0.15s, box-shadow 0.15s;
}
.fcd-where-shell:focus-within {
  border-color: #0D9488;
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.08);
}
.fcd-where-token-bar {
  display: flex;
  gap: 4px;
  padding: 6px 8px;
  background: #F5F5F4;
  border-bottom: 1px solid #E7E5E0;
  flex-wrap: wrap;
}
.fcd-where-token {
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 11px;
  padding: 2px 6px;
  background: #FFFFFF;
  border: 1px solid #E7E5E0;
  border-radius: 3px;
  color: #57534E;
  cursor: pointer;
  transition: all 0.1s;
}
.fcd-where-token:hover {
  border-color: #0D9488;
  color: #0D9488;
}
.fcd-where-input {
  width: 100%;
  border: none;
  outline: none;
  padding: 10px 12px;
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 12px;
  background: transparent;
  color: #1C1917;
  resize: vertical;
  min-height: 50px;
  line-height: 1.5;
  box-sizing: border-box;
}
.fcd-where-input::placeholder { color: #D6D3CD; }

/* SQL preview */
.fcd-sql-warn {
  font-size: 11px;
  color: #B91C1C;
  margin-bottom: 8px;
  padding: 6px 10px;
  background: #FEF2F2;
  border-radius: 4px;
}
.fcd-preview-block {
  background: #1A1A1A;
  border-radius: 6px;
  padding: 12px 14px;
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 11.5px;
  line-height: 1.6;
  color: #E5E5E5;
  overflow-x: auto;
  position: relative;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}
.fcd-preview-label {
  position: absolute;
  top: 8px;
  right: 10px;
  font-size: 9px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: rgba(255, 255, 255, 0.3);
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

/* footer */
.fcd-drawer-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: #FAFAF9;
  border-top: 1px solid #E7E5E0;
  position: sticky;
  bottom: 0;
}
.fcd-footer-meta {
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 10.5px;
  color: #57534E;
}
.fcd-footer-meta .ok { color: #0D9488; margin-right: 4px; }
.fcd-footer-meta .bad { color: #B91C1C; margin-right: 4px; }
.fcd-footer-meta .muted { color: #A8A29E; margin-right: 4px; }
.fcd-footer-actions { display: flex; justify-content: space-between; gap: 8px; width: 100%; }
.fcd-footer-actions-right { display: flex; gap: 8px; }
`,me=J({name:"FilterConfigDialog",props:{visible:{type:Boolean,default:!1},upstream:{type:Array,default:()=>[]},nodeId:{type:String,default:""},nodeConfig:{type:Object,default:null}},emits:{"update:visible":l=>!0,saved:l=>!0,delete:l=>!0},setup(l,{emit:u}){const b=j();if(typeof document<"u"&&!document.getElementById("fcd-styles")){const e=document.createElement("style");e.id="fcd-styles",e.textContent=q,document.head.appendChild(e)}const i=_({alias:"",where:"",columns:[]}),g=d(()=>{const e=new Set,a=[];for(const n of l.upstream)for(const r of n.fields||[])e.has(r.name)||(e.add(r.name),a.push(r));return a}),w=d(()=>l.upstream.length===1),x=d(()=>{var e;return(((e=l.upstream[0])==null?void 0:e.alias)||"").trim()});I(()=>{if(!l.visible)return;const e=l.nodeConfig||{};i.alias=(e.alias||"").toString(),i.where=(e.where||"").toString(),i.columns=Array.isArray(e.columns)?e.columns.map(a=>{var n,r;return{name:((a==null?void 0:a.name)||"").toString(),alias:((r=(n=a==null?void 0:a.alias)!=null?n:a==null?void 0:a.name)!=null?r:"").toString(),enabled:(a==null?void 0:a.enabled)!==!1}}):[],!i.alias.trim()&&x.value&&(i.alias=x.value+"_f"),i.columns.length===0&&(i.columns=g.value.map(a=>({name:a.name,alias:a.name,enabled:!0})))},{flush:"post"});const m=d(()=>{const e=new Map,a=new Map;for(const n of i.columns){if(!n.enabled)continue;const r=(n.alias||"").trim(),s=r.toLowerCase();if(!r){e.set(n.name,{reason:"empty"});continue}a.has(s)?e.set(n.name,{reason:"dup",withName:a.get(s)}):a.set(s,n.name)}return e}),p=d(()=>m.value.size),k=d(()=>i.columns.filter(e=>e.enabled)),F=d(()=>k.value.filter(e=>!m.value.has(e.name)));function C(e,a){const n=i.columns[e];!n||(n.alias=a)}function A(e){const a=i.columns.find(n=>n.name===e);a&&(a.enabled=!a.enabled)}function B(){const e=new Map(i.columns.map(a=>[a.name,a.alias||a.name]));i.columns=g.value.map(a=>{var n,r;return{name:a.name,alias:e.get(a.name)||a.name,enabled:e.get(a.name)&&(r=(n=i.columns.find(s=>s.name===a.name))==null?void 0:n.enabled)!=null?r:!0}})}function D(){for(const e of i.columns)e.enabled=!1}const y=d(()=>{if(!w.value)return"-- \u8BF7\u5148\u8FDE\u5165\u4E00\u4E2A\u4E0A\u6E38\u8282\u70B9\uFF08\u4EC5\u652F\u6301 1 \u5165 1 \u51FA\uFF09";const e=(i.alias||x.value||"filter").trim(),a=F.value;if(a.length===0)return"-- \u6CA1\u6709\u53EF\u8F93\u51FA\u7684\u5217\uFF08\u8BF7\u81F3\u5C11\u52FE\u9009\u4E00\u884C\u5E76\u4FEE\u590D\u522B\u540D\u9519\u8BEF\uFF09";const n=a.map(c=>c.alias&&c.alias!==c.name?`${c.name} AS ${c.alias}`:c.name).join(", "),s=x.value||"upstream";let f=`SELECT ${n}
FROM ${s}`;const h=(i.where||"").trim();return h&&(f+=`
WHERE ${h}`),f+=`
-- \u6574\u4F53\u4F5C\u4E3A\u5B50\u67E5\u8BE2\uFF0C\u8282\u70B9\u522B\u540D: ${e}`,f}),M=d(()=>i.columns.filter(e=>m.value.has(e.name)).map(e=>({name:e.name,err:m.value.get(e.name)})));function z(){if(!w.value){b.error("\u8FC7\u6EE4\u8282\u70B9\u4EC5\u652F\u6301 1 \u5165 1 \u51FA\uFF0C\u8BF7\u5148\u8FDE\u5165\u4E00\u4E2A\u4E0A\u6E38\u8282\u70B9");return}const e=(i.alias||"").trim();if(!e){b.error("\u8BF7\u586B\u5199\u8282\u70B9\u522B\u540D\uFF08\u7528\u4E8E SQL \u5B50\u67E5\u8BE2 AS\uFF09");return}if(!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(e)){b.error("\u522B\u540D\u53EA\u80FD\u5305\u542B\u5B57\u6BCD\u3001\u6570\u5B57\u3001\u4E0B\u5212\u7EBF\uFF0C\u4E14\u4E0D\u80FD\u4EE5\u6570\u5B57\u5F00\u5934");return}if(p.value>0){b.error("\u8F93\u51FA\u540D\u6709\u7A7A\u503C\u6216\u51B2\u7A81\uFF0C\u8BF7\u4FEE\u590D\u540E\u518D\u4FDD\u5B58");return}const a=i.columns.map(n=>{var r,s;return{name:(n.name||"").trim(),alias:((s=(r=n.alias)!=null?r:n.name)!=null?s:"").trim()}});u("saved",{alias:e,where:(i.where||"").trim(),columns:a}),u("update:visible",!1)}function S(){u("update:visible",!1)}function N(){u("delete",{id:l.nodeId}),u("update:visible",!1)}function $(e){let n=(i.where||"").trimEnd();n&&!/\b(AND|OR)\s*$/i.test(n)&&(n+=" AND"),n+=" "+e,i.where=n.trimStart()}return()=>o(L,{show:l.visible,"onUpdate:show":e=>u("update:visible",e),width:560,placement:"right"},{default:()=>[o(R,{title:"\u8FC7\u6EE4\u8282\u70B9\u914D\u7F6E",closable:!0},{default:()=>[o("div",{class:"fcd-section"},[o("div",{class:"fcd-section-num"},[t("01")]),o("div",{class:"fcd-section-title"},[t("\u8282\u70B9\u522B\u540D")]),o("div",{class:"fcd-section-hint"},[t("\u4E0B\u6E38\u8282\u70B9\u5F15\u7528\u6B64\u8282\u70B9\u65F6\u4F7F\u7528\u7684\u540D\u79F0")]),o("div",{class:"fcd-alias-row"},[o("span",{class:"fcd-alias-tag"},[t("alias")]),o("input",{class:"fcd-alias-input",value:i.alias,onInput:e=>i.alias=e.target.value,placeholder:"filter1"},null),i.alias.trim()&&/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(i.alias.trim())?o("span",{class:"fcd-alias-valid"},[t("\u2713")]):o("span",{class:"fcd-alias-valid bad"},[t("!")])])]),o("div",{class:"fcd-section"},[o("div",{class:"fcd-section-num"},[t("02")]),o("div",{class:"fcd-section-title-row"},[o("div",{class:"fcd-section-title"},[t("\u5B57\u6BB5\u6620\u5C04")]),o("div",{class:"fcd-map-actions"},[o("button",{class:"fcd-action-link",onClick:B,type:"button"},[t("+ \u5168\u9009")]),o("button",{class:"fcd-action-link muted",onClick:D,type:"button"},[t("\u2014 \u5168\u4E0D\u9009")]),o("span",{class:"fcd-map-count"},[F.value.length,t(" / "),i.columns.length,t(" \u5408\u6CD5\u8F93\u51FA")])])]),o("div",{class:"fcd-section-hint"},[t("\u4E00\u5BF9\u4E00\u6620\u5C04 \xB7 \u8F93\u51FA\u540D\u4E0D\u80FD\u4E3A\u7A7A\u4E5F\u4E0D\u80FD\u4E0E\u5176\u5B83\u884C\u91CD\u540D")]),i.columns.length===0?o("div",{class:"fcd-empty-hint"},[t("\u672A\u9009\u62E9\u4EFB\u4F55\u8F93\u51FA\u5217 \xB7 \u70B9\u300C+ \u5168\u9009\u300D\u4ECE\u4E0A\u6E38\u62C9\u53D6")]):o("div",{class:"fcd-map-table"},[o("div",{class:"fcd-map-header"},[o("span",null,null),o("span",null,[t("\u6E90\u5B57\u6BB5 (upstream)")]),o("span",null,null),o("span",null,[t("\u8F93\u51FA\u540D (alias)")]),o("span",null,null)]),i.columns.map((e,a)=>{const n=m.value.get(e.name),r=!!n,s=(n==null?void 0:n.reason)==="empty"?"\u7A7A":(n==null?void 0:n.reason)==="dup"?"\u91CD\u540D":null,f=(n==null?void 0:n.reason)==="empty"?"\u8F93\u51FA\u540D\u4E0D\u80FD\u4E3A\u7A7A":(n==null?void 0:n.reason)==="dup"?`\u4E0E\u300C${n.withName}\u300D\u7684\u8F93\u51FA\u540D\u51B2\u7A81`:"",h=["fcd-map-row",e.enabled?"":" disabled",r?" has-conflict":""].filter(Boolean).join(" ");return o("div",{key:e.name+"_"+a,class:h},[o("span",{class:"fcd-map-checkbox"+(e.enabled?" checked":""),onClick:()=>A(e.name)},[e.enabled?"\u2713":""]),o("span",{class:"fcd-map-field-src"},[e.name]),o("span",{class:"fcd-map-arrow"},[t("\u2192")]),o("div",{class:"fcd-map-dst-wrap"},[o("input",{class:"fcd-map-field-dst"+(r?" error":""),value:e.alias,onInput:c=>C(a,c.target.value),placeholder:r?f:e.name,disabled:!e.enabled},null),s&&o(T,null,{trigger:()=>o("span",{class:"fcd-conflict-badge"},[s]),default:()=>o("span",null,[f])})]),o("span",{style:"width: 32px;"},null)])})])]),o("div",{class:"fcd-section"},[o("div",{class:"fcd-section-num"},[t("03")]),o("div",{class:"fcd-section-title"},[t("WHERE \u8FC7\u6EE4")]),o("div",{class:"fcd-section-hint"},[t("\u672A\u586B\u5199 = \u4E0D\u8FC7\u6EE4 \xB7 \u70B9\u51FB\u4E0A\u65B9\u5B57\u6BB5 token \u53EF\u5FEB\u901F\u63D2\u5165")]),o("div",{class:"fcd-where-shell"},[g.value.length>0&&o("div",{class:"fcd-where-token-bar"},[g.value.map(e=>o("button",{key:e.name,class:"fcd-where-token",onClick:()=>$(e.name),type:"button"},[e.name]))]),o("textarea",{class:"fcd-where-input",value:i.where,onInput:e=>i.where=e.target.value,placeholder:"price > 2000 AND category = 'electronics'",rows:3},null)])]),o("div",{class:"fcd-section fcd-section-last"},[o("div",{class:"fcd-section-num"},[t("04")]),o("div",{class:"fcd-section-title"},[t("SQL \u9884\u89C8")]),o("div",{class:"fcd-section-hint"},[t("\u4E0B\u6E38\u9884\u89C8\u8282\u70B9\u4F1A\u7528\u8FD9\u6BB5\u5B50\u67E5\u8BE2")]),p.value>0&&o("div",{class:"fcd-sql-warn"},[t("\u26A0 \u4EC5\u5C55\u793A\u5408\u6CD5\u5217 \xB7")," ",M.value.map(e=>`\u300C${e.name}\u300D`).join("\u3001"),t("\u56E0\u6821\u9A8C\u5931\u8D25\u6682\u88AB\u5FFD\u7565")]),o("pre",{class:"fcd-preview-block"},[o("span",{class:"fcd-preview-label"},[t("LIVE")]),y.value])]),o("div",{class:"fcd-drawer-footer"},[o("div",{class:"fcd-footer-meta"},[p.value===0&&i.columns.length>0?o(E,null,[o("span",{class:"ok"},[t("\u25CF")]),t(" \u5B57\u6BB5\u5F15\u7528\u5168\u90E8\u5408\u6CD5 \xB7")," ",F.value.length,t(" \u5217\u8F93\u51FA")]):p.value>0?o(E,null,[o("span",{class:"bad"},[t("\u25CF")]),t(" "),p.value,t(" \u9879\u9519\u8BEF\u5F85\u4FEE\u590D \xB7")," ",F.value.length,t(" \u5217\u8F93\u51FA\u53EF\u7528")]):o(E,null,[o("span",{class:"muted"},[t("\u25CF")]),t(" \u8FD8\u672A\u9009\u62E9\u8F93\u51FA\u5217")])]),o("div",{class:"fcd-footer-actions"},[o(v,{quaternary:!0,type:"error",onClick:N},{default:()=>[t("\u5220\u9664\u8282\u70B9")]}),o("div",{class:"fcd-footer-actions-right"},[o(v,{onClick:S},{default:()=>[t("\u53D6\u6D88")]}),o(v,{type:"primary",onClick:z,disabled:p.value>0},{default:()=>[t("\u4FDD\u5B58")]})])])])]})]})}});export{me as default};
