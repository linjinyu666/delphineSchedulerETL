import{d as J,D as $,g as c,a1 as j,c as o,z as n,F as w}from"./index.e2a499a0.js";import{u as I}from"./use-message.21762cb2.js";import{N as L,a as _}from"./DrawerContent.e057fd97.js";import{N as q}from"./Tooltip.7d3e32b7.js";import{N as v}from"./Button.5289311a.js";import"./index.d814ba67.js";import"./flatten.dd0953ad.js";import"./Scrollbar.632c53f6.js";import"./VResizeObserver.7a362d95.js";import"./use-false-until-truthy.830dc8b2.js";import"./use-is-composing.b18d156a.js";import"./is-browser.45c3bd93.js";import"./use-merged-state.5f5f01e5.js";import"./index.3ef69258.js";import"./resolve-slot.8e13efbe.js";import"./format-length.d7d829b3.js";import"./Popover.25d00aa8.js";import"./_baseMap.ab7431c2.js";import"./get.3de24c8f.js";import"./cssr.4cb0a96a.js";import"./utils.c8c85f1b.js";import"./use-compitable.0fac5bfa.js";import"./next-frame-once.e5ee25e8.js";import"./browser.7502e29f.js";import"./use-form-item.f54209ce.js";const R=`
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

/* \u4E0E\u8868\u8F93\u5165\u62BD\u5C49\u7EDF\u4E00\uFF1A\u5361\u7247\u5206\u7EC4\u3001\u6D45\u8272\u8FB9\u6846\u3001\u7D27\u51D1\u64CD\u4F5C\u533A */
.fcd-section {
  margin: 0 14px 16px;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}
.fcd-section.fcd-section-last {
  margin-bottom: 0;
  border-bottom: 1px solid #e5e7eb;
}
.fcd-section-num { display: none; }
.fcd-section-title,
.fcd-section-title-row .fcd-section-title {
  color: #1f2937;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0;
  line-height: 20px;
}
.fcd-section-title-row {
  margin-bottom: 10px;
}
.fcd-section-title-row .fcd-section-hint { margin: 0; }
.fcd-section-hint {
  margin: 2px 0 12px;
  color: #94a3b8;
  font-size: 12px;
  line-height: 18px;
}
.fcd-field-label {
  display: block;
  margin-bottom: 6px;
  color: #475569;
  font-size: 13px;
  line-height: 18px;
}
.fcd-required { color: #ef4444; }
.fcd-basic-field {
  display: grid;
  grid-template-columns: 118px minmax(0, 1fr);
  align-items: center;
  column-gap: 12px;
}
.fcd-basic-field + .fcd-basic-field { margin-top: 8px; }
.fcd-basic-field .fcd-field-label {
  margin-bottom: 0;
}
.fcd-type-tag {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 3px 10px;
  border: 1px solid #93c5fd;
  border-radius: 4px;
  color: #2563eb;
  background: #eff6ff;
  font-size: 12px;
  line-height: 18px;
}
.fcd-alias-row {
  min-height: 34px;
  padding: 0 10px;
  border-color: #d9e2ef;
  border-radius: 6px;
  background: #fff;
}
.fcd-alias-row:focus-within {
  border-color: #288fff;
  box-shadow: 0 0 0 2px rgba(40, 143, 255, 0.12);
}
.fcd-alias-tag {
  color: #2563eb;
  background: #eff6ff;
}
.fcd-alias-input {
  padding: 8px 0;
  color: #1f2937;
}
.fcd-alias-valid {
  width: 18px;
  height: 18px;
  background: #10b981;
}
.fcd-alias-valid.bad { background: #ef4444; }
.fcd-map-table {
  max-height: 300px;
  overflow: auto;
  border-color: #e5e7eb;
  border-radius: 8px;
  scrollbar-width: thin;
}
.fcd-map-table::-webkit-scrollbar { width: 8px; height: 8px; }
.fcd-map-table::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: #cbd5e1;
}
.fcd-map-header {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 7px 10px;
  background: #f8fafc;
  border-bottom-color: #e5e7eb;
  color: #475569;
  font-size: 11px;
  letter-spacing: 0;
  text-transform: none;
}
.fcd-map-row {
  min-height: 32px;
  padding: 3px 10px;
  border-bottom-color: #eef2f7;
}
.fcd-map-row:hover { background: #eff6ff; }
.fcd-map-row.disabled { background: #f8fafc; }
.fcd-map-checkbox {
  border-color: #cbd5e1;
  border-radius: 4px;
}
.fcd-map-checkbox.checked {
  background: #0ea5a4;
  border-color: #0ea5a4;
}
.fcd-map-field-src {
  padding-top: 3px;
  padding-bottom: 3px;
  line-height: 16px;
}
.fcd-map-field-dst {
  height: 26px;
  padding-top: 3px;
  padding-bottom: 3px;
  line-height: 16px;
}
.fcd-map-field-src {
  color: #1f2937;
  background: #f1f5f9;
}
.fcd-map-field-dst {
  border-color: #d9e2ef;
  color: #1f2937;
}
.fcd-map-field-dst:focus {
  border-color: #288fff;
  box-shadow: 0 0 0 2px rgba(40, 143, 255, 0.12);
}
.fcd-map-actions { gap: 6px; }
.fcd-action-link {
  padding: 5px 8px;
  color: #2563eb;
  border: 1px solid #dbeafe;
  border-radius: 5px;
  background: #eff6ff;
}
.fcd-action-link:hover { background: #dbeafe; }
.fcd-action-link.muted {
  color: #475569;
  border-color: #e2e8f0;
  background: #f8fafc;
}
.fcd-action-link.muted:hover { background: #f1f5f9; }
.fcd-map-count {
  color: #2563eb;
  background: #eff6ff;
}
.fcd-where-shell {
  border-color: #d9e2ef;
  border-radius: 8px;
}
.fcd-where-shell:focus-within {
  border-color: #288fff;
  box-shadow: 0 0 0 2px rgba(40, 143, 255, 0.12);
}
.fcd-where-token-bar {
  padding: 8px;
  background: #f8fafc;
  border-bottom-color: #e5e7eb;
}
.fcd-where-token {
  border-color: #dbeafe;
  color: #2563eb;
  background: #eff6ff;
}
.fcd-where-token:hover {
  border-color: #93c5fd;
  color: #1d4ed8;
}
.fcd-where-input { min-height: 72px; }
.fcd-preview-block {
  border-radius: 8px;
  background: #111827;
}
.fcd-drawer-footer {
  margin-top: 0;
  padding: 12px 16px;
  background: #f8fafc;
  border-top-color: #e5e7eb;
}
.fcd-footer-actions { justify-content: flex-end; }
.fcd-footer-meta { margin-right: auto; color: #64748b; }
`,ue=J({name:"FilterConfigDialog",props:{visible:{type:Boolean,default:!1},upstream:{type:Array,default:()=>[]},nodeId:{type:String,default:""},nodeConfig:{type:Object,default:null}},emits:{"update:visible":l=>!0,saved:l=>!0,delete:l=>!0},setup(l,{emit:m}){const b=I();if(typeof document<"u"&&!document.getElementById("fcd-styles")){const e=document.createElement("style");e.id="fcd-styles",e.textContent=R,document.head.appendChild(e)}const r=$({alias:"",where:"",columns:[]}),g=c(()=>{const e=new Set,a=[];for(const t of l.upstream)for(const i of t.fields||[])e.has(i.name)||(e.add(i.name),a.push(i));return a}),E=c(()=>l.upstream.length===1),x=c(()=>{var e;return(((e=l.upstream[0])==null?void 0:e.alias)||"").trim()});j(()=>{if(!l.visible)return;const e=l.nodeConfig||{};r.alias=(e.alias||"").toString(),r.where=(e.where||"").toString(),r.columns=Array.isArray(e.columns)?e.columns.map(a=>{var t,i;return{name:((a==null?void 0:a.name)||"").toString(),alias:((i=(t=a==null?void 0:a.alias)!=null?t:a==null?void 0:a.name)!=null?i:"").toString(),enabled:(a==null?void 0:a.enabled)!==!1}}):[],!r.alias.trim()&&x.value&&(r.alias=x.value+"_f"),r.columns.length===0&&(r.columns=g.value.map(a=>({name:a.name,alias:a.name,enabled:!0})))},{flush:"post"});const f=c(()=>{const e=new Map,a=new Map;for(const t of r.columns){if(!t.enabled)continue;const i=(t.alias||"").trim(),d=i.toLowerCase();if(!i){e.set(t.name,{reason:"empty"});continue}a.has(d)?e.set(t.name,{reason:"dup",withName:a.get(d)}):a.set(d,t.name)}return e}),p=c(()=>f.value.size),k=c(()=>r.columns.filter(e=>e.enabled)),F=c(()=>k.value.filter(e=>!f.value.has(e.name)));function C(e,a){const t=r.columns[e];!t||(t.alias=a)}function A(e){const a=r.columns.find(t=>t.name===e);a&&(a.enabled=!a.enabled)}function y(){const e=new Map(r.columns.map(a=>[a.name,a.alias||a.name]));r.columns=g.value.map(a=>{var t,i;return{name:a.name,alias:e.get(a.name)||a.name,enabled:e.get(a.name)&&(i=(t=r.columns.find(d=>d.name===a.name))==null?void 0:t.enabled)!=null?i:!0}})}function B(){for(const e of r.columns)e.enabled=!1}const D=c(()=>{if(!E.value)return"-- \u8BF7\u5148\u8FDE\u5165\u4E00\u4E2A\u4E0A\u6E38\u8282\u70B9\uFF08\u4EC5\u652F\u6301 1 \u5165 1 \u51FA\uFF09";const e=(r.alias||x.value||"filter").trim(),a=F.value;if(a.length===0)return"-- \u6CA1\u6709\u53EF\u8F93\u51FA\u7684\u5217\uFF08\u8BF7\u81F3\u5C11\u52FE\u9009\u4E00\u884C\u5E76\u4FEE\u590D\u522B\u540D\u9519\u8BEF\uFF09";const t=a.map(s=>s.alias&&s.alias!==s.name?`${s.name} AS ${s.alias}`:s.name).join(", "),d=x.value||"upstream";let u=`SELECT ${t}
FROM ${d}`;const h=(r.where||"").trim();return h&&(u+=`
WHERE ${h}`),u+=`
-- \u6574\u4F53\u4F5C\u4E3A\u5B50\u67E5\u8BE2\uFF0C\u8282\u70B9\u522B\u540D: ${e}`,u}),M=c(()=>r.columns.filter(e=>f.value.has(e.name)).map(e=>({name:e.name,err:f.value.get(e.name)})));function z(){if(!E.value){b.error("\u8FC7\u6EE4\u8282\u70B9\u4EC5\u652F\u6301 1 \u5165 1 \u51FA\uFF0C\u8BF7\u5148\u8FDE\u5165\u4E00\u4E2A\u4E0A\u6E38\u8282\u70B9");return}const e=(r.alias||"").trim();if(!e){b.error("\u8BF7\u586B\u5199\u8282\u70B9\u522B\u540D\uFF08\u7528\u4E8E SQL \u5B50\u67E5\u8BE2 AS\uFF09");return}if(!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(e)){b.error("\u522B\u540D\u53EA\u80FD\u5305\u542B\u5B57\u6BCD\u3001\u6570\u5B57\u3001\u4E0B\u5212\u7EBF\uFF0C\u4E14\u4E0D\u80FD\u4EE5\u6570\u5B57\u5F00\u5934");return}if(p.value>0){b.error("\u8F93\u51FA\u540D\u6709\u7A7A\u503C\u6216\u51B2\u7A81\uFF0C\u8BF7\u4FEE\u590D\u540E\u518D\u4FDD\u5B58");return}const a=r.columns.map(t=>{var i,d;return{name:(t.name||"").trim(),alias:((d=(i=t.alias)!=null?i:t.name)!=null?d:"").trim()}});m("saved",{alias:e,where:(r.where||"").trim(),columns:a}),m("update:visible",!1)}function S(){m("update:visible",!1)}function N(e){let t=(r.where||"").trimEnd();t&&!/\b(AND|OR)\s*$/i.test(t)&&(t+=" AND"),t+=" "+e,r.where=t.trimStart()}return()=>o(L,{show:l.visible,"onUpdate:show":e=>m("update:visible",e),width:620,placement:"right"},{default:()=>[o(_,{title:"\u8FC7\u6EE4\u8282\u70B9\u914D\u7F6E",closable:!0},{default:()=>[o("div",{class:"fcd-section"},[o("div",{class:"fcd-section-title-row"},[o("div",{class:"fcd-section-title"},[n("\u57FA\u672C\u4FE1\u606F")]),o("div",{class:"fcd-section-hint"},[n("\u7528\u4E8E\u8BC6\u522B\u753B\u5E03\u8282\u70B9\u548C SQL \u522B\u540D")])]),o("div",{class:"fcd-basic-field"},[o("label",{class:"fcd-field-label"},[n("\u8282\u70B9\u540D\u79F0(\u522B\u540D) "),o("span",{class:"fcd-required"},[n("*")])]),o("div",{class:"fcd-alias-row"},[o("input",{class:"fcd-alias-input",value:r.alias,onInput:e=>r.alias=e.target.value,placeholder:"\u4F8B\u5982 filter1"},null)])]),o("div",{class:"fcd-basic-field"},[o("label",{class:"fcd-field-label"},[n("\u7C7B\u578B")]),o("span",{class:"fcd-type-tag"},[n("filter")])])]),o("div",{class:"fcd-section"},[o("div",{class:"fcd-section-title-row"},[o("div",{class:"fcd-section-title"},[n("\u5B57\u6BB5\u9009\u62E9\u4E0E\u6620\u5C04")]),o("div",{class:"fcd-map-actions"},[o("button",{class:"fcd-action-link",onClick:y,type:"button"},[n("\u5168\u9009")]),o("button",{class:"fcd-action-link muted",onClick:B,type:"button"},[n("\u6E05\u7A7A\u53EF\u9009")]),o("span",{class:"fcd-map-count"},[n("\u5DF2\u9009 "),k.value.length,n(" / "),r.columns.length])])]),o("div",{class:"fcd-section-hint"},[n("\u4E00\u5BF9\u4E00\u6620\u5C04 \xB7 \u8F93\u51FA\u540D\u4E0D\u80FD\u4E3A\u7A7A\u4E5F\u4E0D\u80FD\u4E0E\u5176\u5B83\u884C\u91CD\u540D")]),r.columns.length===0?o("div",{class:"fcd-empty-hint"},[n("\u672A\u9009\u62E9\u4EFB\u4F55\u8F93\u51FA\u5217 \xB7 \u70B9\u300C+ \u5168\u9009\u300D\u4ECE\u4E0A\u6E38\u62C9\u53D6")]):o("div",{class:"fcd-map-table"},[o("div",{class:"fcd-map-header"},[o("span",null,null),o("span",null,[n("\u6E90\u5B57\u6BB5 (upstream)")]),o("span",null,null),o("span",null,[n("\u8F93\u51FA\u540D (alias)")]),o("span",null,null)]),r.columns.map((e,a)=>{const t=f.value.get(e.name),i=!!t,d=(t==null?void 0:t.reason)==="empty"?"\u7A7A":(t==null?void 0:t.reason)==="dup"?"\u91CD\u540D":null,u=(t==null?void 0:t.reason)==="empty"?"\u8F93\u51FA\u540D\u4E0D\u80FD\u4E3A\u7A7A":(t==null?void 0:t.reason)==="dup"?`\u4E0E\u300C${t.withName}\u300D\u7684\u8F93\u51FA\u540D\u51B2\u7A81`:"",h=["fcd-map-row",e.enabled?"":" disabled",i?" has-conflict":""].filter(Boolean).join(" ");return o("div",{key:e.name+"_"+a,class:h},[o("span",{class:"fcd-map-checkbox"+(e.enabled?" checked":""),onClick:()=>A(e.name)},[e.enabled?"\u2713":""]),o("span",{class:"fcd-map-field-src"},[e.name]),o("span",{class:"fcd-map-arrow"},[n("\u2192")]),o("div",{class:"fcd-map-dst-wrap"},[o("input",{class:"fcd-map-field-dst"+(i?" error":""),value:e.alias,onInput:s=>C(a,s.target.value),placeholder:i?u:e.name,disabled:!e.enabled},null),d&&o(q,null,{trigger:()=>o("span",{class:"fcd-conflict-badge"},[d]),default:()=>o("span",null,[u])})]),o("span",{style:"width: 32px;"},null)])})])]),o("div",{class:"fcd-section"},[o("div",{class:"fcd-section-title"},[n("WHERE \u8FC7\u6EE4")]),o("div",{class:"fcd-section-hint"},[n("\u672A\u586B\u5199 = \u4E0D\u8FC7\u6EE4 \xB7 \u70B9\u51FB\u4E0A\u65B9\u5B57\u6BB5 token \u53EF\u5FEB\u901F\u63D2\u5165")]),o("div",{class:"fcd-where-shell"},[g.value.length>0&&o("div",{class:"fcd-where-token-bar"},[g.value.map(e=>o("button",{key:e.name,class:"fcd-where-token",onClick:()=>N(e.name),type:"button"},[e.name]))]),o("textarea",{class:"fcd-where-input",value:r.where,onInput:e=>r.where=e.target.value,placeholder:"price > 2000 AND category = 'electronics'",rows:3},null)])]),o("div",{class:"fcd-section fcd-section-last"},[o("div",{class:"fcd-section-title"},[n("SQL \u9884\u89C8")]),o("div",{class:"fcd-section-hint"},[n("\u4E0B\u6E38\u9884\u89C8\u8282\u70B9\u4F1A\u7528\u8FD9\u6BB5\u5B50\u67E5\u8BE2")]),p.value>0&&o("div",{class:"fcd-sql-warn"},[n("\u26A0 \u4EC5\u5C55\u793A\u5408\u6CD5\u5217 \xB7")," ",M.value.map(e=>`\u300C${e.name}\u300D`).join("\u3001"),n("\u56E0\u6821\u9A8C\u5931\u8D25\u6682\u88AB\u5FFD\u7565")]),o("pre",{class:"fcd-preview-block"},[o("span",{class:"fcd-preview-label"},[n("LIVE")]),D.value])]),o("div",{class:"fcd-drawer-footer"},[o("div",{class:"fcd-footer-meta"},[p.value===0&&r.columns.length>0?o(w,null,[o("span",{class:"ok"},[n("\u25CF")]),n(" \u5B57\u6BB5\u5F15\u7528\u5168\u90E8\u5408\u6CD5 \xB7")," ",F.value.length,n(" \u5217\u8F93\u51FA")]):p.value>0?o(w,null,[o("span",{class:"bad"},[n("\u25CF")]),n(" "),p.value,n(" \u9879\u9519\u8BEF\u5F85\u4FEE\u590D \xB7")," ",F.value.length,n(" \u5217\u8F93\u51FA\u53EF\u7528")]):o(w,null,[o("span",{class:"muted"},[n("\u25CF")]),n(" \u8FD8\u672A\u9009\u62E9\u8F93\u51FA\u5217")])]),o("div",{class:"fcd-footer-actions"},[o("div",{class:"fcd-footer-actions-right"},[o(v,{onClick:S},{default:()=>[n("\u53D6\u6D88")]}),o(v,{type:"primary",onClick:z,disabled:p.value>0},{default:()=>[n("\u4FDD\u5B58")]})])])])]})]})}});export{ue as default};
