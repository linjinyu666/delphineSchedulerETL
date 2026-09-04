import{N as V,a as q}from"./DrawerContent.acedd3f7.js";import{d as P,r as Q,g as m,a1 as X,c as e,z as a}from"./index.291055ec.js";import"./index.64209708.js";import"./Scrollbar.c679a5ee.js";import"./VResizeObserver.4329b960.js";import"./use-false-until-truthy.c0107dd9.js";import"./use-is-composing.29ff64de.js";import"./is-browser.45c3bd93.js";import"./use-merged-state.b2e27208.js";import"./index.3ef69258.js";import"./call.00499c7e.js";import"./format-length.d7d829b3.js";const ge=P({name:"CompareConfigDialog",props:{visible:{type:Boolean,default:!1},nodeId:{type:String,default:""},nodeLabel:{type:String,default:""},nodeConfig:{type:Object,default:()=>({})},upstreams:{type:Array,default:()=>[]}},emits:["update:visible","save","delete","close"],setup(t,{emit:b}){const o=Q({alias:"",srcId:"",tgtId:"",key:"",columns:[],output:{added:!0,deleted:!0,changed:!0,unchanged:!1}}),F=m(()=>t.upstreams.find(c=>c.id===o.value.srcId)||t.upstreams[0]),v=m(()=>t.upstreams.find(c=>c.id===o.value.tgtId)||t.upstreams[1]||t.upstreams[0]),w=m(()=>{var d,s;const c=new Map;return(((d=F.value)==null?void 0:d.fields)||[]).forEach(l=>c.set(l.name,l)),(((s=v.value)==null?void 0:s.fields)||[]).forEach(l=>c.set(l.name,l)),Array.from(c.values())}),z=m(()=>t.upstreams.length===2),A=m(()=>{var c;return!((c=o.value.key)!=null&&c.trim())});X(()=>{var d,s,l;if(!t.visible)return;const c=t.nodeConfig||{};o.value.alias=(c.alias||"").toString(),o.value.srcId=(c.srcId||((d=t.upstreams[0])==null?void 0:d.id)||"").toString(),o.value.tgtId=(c.tgtId||((s=t.upstreams[1])==null?void 0:s.id)||((l=t.upstreams[0])==null?void 0:l.id)||"").toString(),o.value.key=(c.key||"id").toString(),o.value.columns=Array.isArray(c.columns)?c.columns.map(r=>({name:r.name,enabled:r.enabled!==!1})):w.value.map(r=>({name:r.name,enabled:!0})),o.value.output=c.output||{added:!0,deleted:!0,changed:!0,unchanged:!1},o.value.alias.trim()||(o.value.alias="compare1"),o.value.columns.length===0&&w.value.length>0&&(o.value.columns=w.value.map(r=>({name:r.name,enabled:!0})))});function H(){const c=o.value.srcId;o.value.srcId=o.value.tgtId,o.value.tgtId=c}function M(c){const d=c===1?t.upstreams[1]:t.upstreams[0],s=c===1?t.upstreams[0]:t.upstreams[1];!s||!d||(o.value.srcId=s.id,o.value.tgtId=d.id)}function I(c){M(c===1?2:1)}function G(){for(const c of o.value.columns)c.enabled=!0}function _(){for(const c of o.value.columns)c.enabled=!1}function y(c){o.value.output=o.value.output||{},o.value.output[c]=!o.value.output[c]}function S(){b("update:visible",!1),b("close")}function K(){b("save",JSON.parse(JSON.stringify(o.value))),S()}function W(){b("delete",{id:t.nodeId}),S()}const Y=m(()=>{var B,C;if(!z.value)return"-- \u8BF7\u5148\u8FDE\u5165 2 \u4E2A\u4E0A\u6E38\u8282\u70B9";if(A.value)return"-- \u8BF7\u586B\u5199\u4E3B\u952E\u5B57\u6BB5(\u5982 id)";const c=((B=F.value)==null?void 0:B.alias)||"src",d=((C=v.value)==null?void 0:C.alias)||"tgt",s=o.value.key.split(",").map(i=>i.trim()).filter(Boolean),l=o.value.columns.filter(i=>i.enabled),r=l.length>0?l.map(i=>`${c}.${i.name} AS s_${i.name}, ${d}.${i.name} AS t_${i.name}`).join(`,
  `):`${c}.*, ${d}.*`,E=l.length>0?l.map(i=>`(${c}.${i.name} <> ${d}.${i.name} OR (${c}.${i.name} IS NULL) <> (${d}.${i.name} IS NULL))`).join(`
      OR `):"",k=(o.value.alias||"compare1").trim(),g=o.value.output||{},u=[];g.added!==!1&&u.push("'+'"),g.deleted!==!1&&u.push("'-'"),g.changed!==!1&&u.push("'~'"),g.unchanged===!0&&u.push("'='");const D=u.length>0?`WHERE ${k}.cmp_op IN (${u.join(", ")})`:"";return`SELECT * FROM (
SELECT
  CASE
    WHEN ${c}.${s[0]} IS NULL THEN '+'
    WHEN ${d}.${s[0]} IS NULL THEN '-'
    ${E?`WHEN ${E} THEN '~'`:""}
    ELSE '='
  END AS cmp_op,
  COALESCE(${c}.${s[0]}, ${d}.${s[0]}) AS cmp_id,
  ${r}
FROM ${c} FULL OUTER JOIN ${d}
  ON ${s.map(i=>`${c}.${i} = ${d}.${i}`).join(" AND ")}
) AS ${k}
${D}`}),h=m(()=>{let c=0;return z.value||c++,A.value&&c++,c});return()=>e(V,{show:t.visible,width:620,placement:"right",onUpdateShow:c=>b("update:visible",c)},{default:()=>[e(q,{title:`\u6570\u636E\u6BD4\u5BF9 \xB7 ${o.value.alias||"\u672A\u547D\u540D"}`,closable:!0},{default:()=>{var c,d,s,l,r,E,k,g,u,D,B,C,i,N,J,T,L,O;return e("div",{class:"ccd-drawer"},[e(Z,null,null),e("div",{class:"ccd-header"},[e("div",{class:"ccd-header-left"},[e("div",{class:"ccd-node-chip"},[a("\u229F")]),e("div",null,[e("div",{class:"ccd-header-title"},[a("\u6570\u636E\u6BD4\u5BF9 \xB7 "),o.value.alias||"\u672A\u547D\u540D"]),e("div",{class:"ccd-header-sub"},[a("2 in \xB7 1 out \xB7 FULL OUTER JOIN")])])]),e("div",{class:"ccd-header-right"},[e("span",{class:`ccd-status-tag ${h.value>0?"bad":""}`},[a("\u25CF "),h.value>0?`${h.value} \u9879\u5F85\u4FEE\u590D`:"\u5DF2\u914D\u7F6E"])])]),e("div",{class:"ccd-upstream"},[e("div",{class:"ccd-up-card"},[e("div",{class:"ccd-up-role"},[e("button",{class:`up-role-btn ${o.value.srcId===((c=t.upstreams[0])==null?void 0:c.id)?"active src":""}`,onClick:()=>M(1)},[a("SRC")]),e("button",{class:`up-role-btn ${o.value.tgtId===((d=t.upstreams[0])==null?void 0:d.id)?"active tgt":""}`,onClick:()=>I(1)},[a("TGT")])]),e("span",{class:"ccd-up-alias"},[((s=t.upstreams[0])==null?void 0:s.alias)||"?"]),e("span",{class:"ccd-up-fields"},[((r=(l=t.upstreams[0])==null?void 0:l.fields)==null?void 0:r.length)||0,a(" \u5B57\u6BB5")])]),e("button",{class:"ccd-swap",onClick:H,title:"\u4EA4\u6362\u6E90/\u76EE\u6807"},[a("\u21C4")]),e("div",{class:"ccd-up-card"},[e("div",{class:"ccd-up-role"},[e("button",{class:`up-role-btn ${o.value.srcId===((E=t.upstreams[1])==null?void 0:E.id)?"active src":""}`,onClick:()=>M(2)},[a("SRC")]),e("button",{class:`up-role-btn ${o.value.tgtId===((k=t.upstreams[1])==null?void 0:k.id)?"active tgt":""}`,onClick:()=>I(2)},[a("TGT")])]),e("span",{class:"ccd-up-alias"},[((g=t.upstreams[1])==null?void 0:g.alias)||"?"]),e("span",{class:"ccd-up-fields"},[((D=(u=t.upstreams[1])==null?void 0:u.fields)==null?void 0:D.length)||0,a(" \u5B57\u6BB5")])])]),e("div",{class:"ccd-section"},[e("div",{class:"ccd-section-num"},[a("01")]),e("div",{class:"ccd-section-title"},[a("\u57FA\u672C\u914D\u7F6E")]),e("div",{class:"ccd-section-hint"},[a("\u8282\u70B9\u522B\u540D\uFF08\u4E0B\u6E38\u5F15\u7528\uFF09\u4E0E\u4E3B\u952E\u5B57\u6BB5\uFF08\u7528\u4E8E\u4E24\u8868\u5173\u8054\uFF09")]),e("div",{class:"ccd-identity-grid"},[e("div",{class:"ccd-field-input"},[e("span",{class:"ccd-field-icon"},[a("alias")]),e("input",{value:o.value.alias,onInput:n=>o.value.alias=n.target.value,placeholder:"compare1"},null),o.value.alias.trim()?e("span",{class:"ccd-valid"},[a("\u2713")]):e("span",{class:"ccd-valid bad"},[a("!")])]),e("div",{class:`ccd-field-input ${A.value?"error":""}`},[e("span",{class:"ccd-field-icon"},[a("\u{1F511}")]),e("input",{value:o.value.key,onInput:n=>o.value.key=n.target.value,placeholder:"\u70B9\u51FB\u4E0B\u9762\u5B57\u6BB5 token \u9009\u4E3B\u952E",readonly:!0},null),o.value.key.trim()?e("span",{class:"ccd-valid"},[a("\u2713")]):e("span",{class:"ccd-valid bad"},[a("!")])])]),e("div",{class:"ccd-key-tokens"},[o.value.columns.map(n=>{const f=(o.value.key||"").split(",").map(x=>x.trim()).filter(Boolean),p=f.includes(n.name);return e("button",{class:`ccd-key-token ${p?"is-key":""}`,onClick:()=>{p?o.value.key=f.filter(x=>x!==n.name).join(","):(f.push(n.name),o.value.key=f.join(","))},type:"button"},[a("\u{1F511} "),n.name])})]),(o.value.key||"").split(",").filter(n=>n.trim()).length>=3&&e("div",{class:"ccd-key-warn"},[a("\u26A0 \u9009\u592A\u591A KEY \u4F1A\u8BA9\u6BCF\u884C\u90FD\u4E0D\u540C(\u53EF\u80FD\u5B8C\u5168\u65E0\u6CD5\u5339\u914D)")])]),e("div",{class:"ccd-section"},[e("div",{class:"ccd-section-num"},[a("02")]),e("div",{class:"ccd-section-title"},[a("\u5B57\u6BB5\u6620\u5C04")]),e("div",{class:"ccd-section-hint"},[a("\u52FE\u9009\u5B57\u6BB5 = \u53C2\u4E0E\u6BD4\u5BF9 \xB7 \u7B2C\u4E00\u5217 \u231CKEY\u231F \u6807\u8BB0\u4E3B\u952E\u5B57\u6BB5")]),o.value.columns.length===0?e("div",{class:"ccd-empty-hint"},[a("\u65E0\u53EF\u6BD4\u5BF9\u5B57\u6BB5")]):e("div",{class:"ccd-map-table"},[e("div",{class:"ccd-map-header"},[e("span",{class:"l-h"},[a("SRC \xB7 "),(B=F.value)==null?void 0:B.alias]),e("span",{class:"center"},[a("=")]),e("span",{class:"r-h"},[a("TGT \xB7 "),(C=v.value)==null?void 0:C.alias]),e("span",{class:"center"},[a("\u2713")])]),o.value.columns.map((n,f)=>{var x,R,U,j;const p=!((R=(x=F.value)==null?void 0:x.fields)!=null&&R.some($=>$.name===n.name))||!((j=(U=v.value)==null?void 0:U.fields)!=null&&j.some($=>$.name===n.name));return e("div",{key:n.name+"_"+f,class:`ccd-map-row ${n.enabled?"":"disabled"} ${p?"is-mismatch":""}`},[e("span",{class:"ccd-map-field"},[n.name]),e("span",{class:"ccd-map-arrow"},[a("=")]),e("span",{class:`ccd-map-field r ${p?"missing":""}`},[p?"\u4E0D\u5B58\u5728":n.name]),e("span",{class:`ccd-map-marker ${p?"missing":"matched"}`},[p?"!":"\u2713"])])})]),e("div",{class:"ccd-map-actions"},[e("button",{class:"ccd-action-link",onClick:G},[a("+ \u5168\u9009")]),e("button",{class:"ccd-action-link muted",onClick:_},[a("\u2212 \u5168\u4E0D\u9009")]),e("span",{class:"ccd-map-count"},[o.value.columns.filter(n=>n.enabled).length,a(" / "),o.value.columns.length,a(" \u53C2\u4E0E\u6BD4\u5BF9")])])]),e("div",{class:"ccd-section"},[e("div",{class:"ccd-section-num"},[a("03")]),e("div",{class:"ccd-section-title"},[a("\u8F93\u51FA\u54EA\u4E9B\u5DEE\u5F02\u884C")]),e("div",{class:"ccd-section-hint"},[a("\u6BCF\u884C\u5E26 cmp_op \u6807\u8BB0 \xB7 \u9ED8\u8BA4\u4EC5\u8F93\u51FA + / \u2212 / ~")]),e("div",{class:"ccd-toggle-grid"},[e("div",{class:`ccd-toggle ${((i=o.value.output)==null?void 0:i.added)!==!1?"on":""}`,onClick:()=>y("added")},[e("span",{class:"ccd-toggle-icon add"},[a("+")]),e("div",{class:"ccd-toggle-text"},[e("div",{class:"zh"},[a("\u65B0\u589E")]),e("div",{class:"en"},[a("ADDED \xB7 TGT \u5B58\u5728 SRC \u65E0")])]),e("div",{class:"ccd-toggle-switch"},null)]),e("div",{class:`ccd-toggle ${((N=o.value.output)==null?void 0:N.deleted)!==!1?"on":""}`,onClick:()=>y("deleted")},[e("span",{class:"ccd-toggle-icon del"},[a("\u2212")]),e("div",{class:"ccd-toggle-text"},[e("div",{class:"zh"},[a("\u5220\u9664")]),e("div",{class:"en"},[a("DELETED \xB7 SRC \u5B58\u5728 TGT \u65E0")])]),e("div",{class:"ccd-toggle-switch"},null)]),e("div",{class:`ccd-toggle ${((J=o.value.output)==null?void 0:J.changed)!==!1?"on":""}`,onClick:()=>y("changed")},[e("span",{class:"ccd-toggle-icon mod"},[a("~")]),e("div",{class:"ccd-toggle-text"},[e("div",{class:"zh"},[a("\u4FEE\u6539")]),e("div",{class:"en"},[a("CHANGED \xB7 \u5185\u5BB9\u4E0D\u4E00\u81F4")])]),e("div",{class:"ccd-toggle-switch"},null)]),e("div",{class:`ccd-toggle ${((T=o.value.output)==null?void 0:T.unchanged)===!0?"on":""}`,onClick:()=>y("unchanged")},[e("span",{class:"ccd-toggle-icon same"},[a("=")]),e("div",{class:"ccd-toggle-text"},[e("div",{class:"zh"},[a("\u4E00\u81F4")]),e("div",{class:"en"},[a("UNCHANGED \xB7 \u5B8C\u5168\u76F8\u540C")])]),e("div",{class:"ccd-toggle-switch"},null)])])]),e("div",{class:"ccd-section"},[e("div",{class:"ccd-section-num"},[a("04")]),e("div",{class:"ccd-section-title"},[a("SQL \u9884\u89C8")]),e("div",{class:"ccd-section-hint"},[a("\u4E0B\u6E38\u9884\u89C8\u8282\u70B9\u5C06\u4F5C\u4E3A\u5B50\u67E5\u8BE2\u6D88\u8D39\u6B64\u7ED3\u679C")]),e("pre",{class:"ccd-preview-block"},[e("span",{class:"ccd-preview-label"},[a("LIVE")]),Y.value])]),e("div",{class:"ccd-footer"},[e("div",{class:"ccd-footer-meta"},[h.value>0?e("span",{class:"bad"},[a("\u25CF")]):e("span",{class:"ok"},[a("\u25CF")])," ",a("SRC = "),((L=F.value)==null?void 0:L.alias)||"?",a(" \xB7 TGT = "),((O=v.value)==null?void 0:O.alias)||"?",a(" \xB7 ")," ",(o.value.key||"").split(",").filter(n=>n.trim()).length,a(" KEY \xB7 ")," ",o.value.columns.filter(n=>n.enabled).length,a(" \u5B57\u6BB5\u6BD4\u5BF9")]),e("div",{class:"ccd-footer-actions"},[e("button",{class:"ccd-btn danger",onClick:W},[a("\u5220\u9664\u8282\u70B9")]),e("div",{class:"ccd-footer-actions-right"},[e("button",{class:"ccd-btn",onClick:S},[a("\u53D6\u6D88")]),e("button",{class:"ccd-btn primary",onClick:K,disabled:h.value>0},[a("\u4FDD\u5B58")])])])])])}})]})}});function Z(){return e("style",null,[ee])}const ee=`
.ccd-drawer {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background: #FFFFFF;
  color: #1C1917;
  position: relative;
  background-image:
    radial-gradient(circle at 100% 0%, rgba(249, 115, 22, 0.025), transparent 35%),
    radial-gradient(circle at 0% 100%, rgba(13, 148, 136, 0.018), transparent 35%);
}
.ccd-header {
  padding: 16px 24px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #E7E5E0;
}
.ccd-header-left { display: flex; align-items: center; gap: 12px; }
.ccd-node-chip {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: linear-gradient(135deg, #F97316 0%, #EA580C 100%);
  display: grid;
  place-items: center;
  color: white;
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(249, 115, 22, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.25);
}
.ccd-header-title {
  font-size: 14px;
  font-weight: 600;
  color: #1C1917;
  letter-spacing: -0.01em;
}
.ccd-header-sub {
  font-size: 11px;
  color: #A8A29E;
  margin-top: 2px;
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
}
.ccd-header-right { display: flex; align-items: center; gap: 12px; }
.ccd-status-tag {
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 10px;
  padding: 3px 8px;
  border-radius: 3px;
  background: #CCFBF1;
  color: #0F766E;
  font-weight: 600;
}
.ccd-status-tag.bad { background: #FEE2E2; color: #B91C1C; }

.ccd-upstream {
  padding: 12px 24px;
  background: #FAFAF9;
  border-bottom: 1px solid #E7E5E0;
  display: flex;
  align-items: center;
  gap: 12px;
}
.ccd-up-card {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #FFFFFF;
  border: 1px solid #E7E5E0;
  border-radius: 6px;
}
.ccd-up-role {
  display: inline-flex;
  background: #F5F5F4;
  border-radius: 3px;
  padding: 1px;
  border: 1px solid #E7E5E0;
}
.up-role-btn {
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 9px;
  font-weight: 600;
  padding: 3px 7px;
  border-radius: 2px;
  border: none;
  background: transparent;
  color: #A8A29E;
  cursor: pointer;
}
.up-role-btn.active.src { background: #DBEAFE; color: #1D4ED8; }
.up-role-btn.active.tgt { background: #EDE9FE; color: #7C3AED; }
.ccd-up-alias {
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 12px;
  font-weight: 600;
  flex: 1;
}
.ccd-up-fields {
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 10px;
  color: #A8A29E;
}
.ccd-swap {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #FFFFFF;
  border: 1.5px solid #F97316;
  color: #C2410C;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
}
.ccd-swap:hover { background: #FFEDD5; transform: rotate(180deg); }

.ccd-section {
  padding: 18px 24px;
  border-bottom: 1px solid #E7E5E0;
}
.ccd-section-num {
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 10px;
  color: #D6D3CD;
  letter-spacing: 0.1em;
  margin-bottom: 4px;
}
.ccd-section-title {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.ccd-section-hint {
  font-size: 11px;
  color: #A8A29E;
  margin-top: 3px;
  margin-bottom: 14px;
  line-height: 1.4;
}

.ccd-identity-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.ccd-field-input {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #FAFAF9;
  border: 1px solid #E7E5E0;
  border-radius: 6px;
  padding: 0 10px;
  transition: all 0.15s;
}
.ccd-field-input:focus-within {
  border-color: #0D9488;
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.08);
  background: #FFFFFF;
}
.ccd-field-input.error { border-color: #B91C1C; background: #FEF2F2; }
.ccd-field-icon {
  width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  color: #A8A29E;
  font-size: 11px;
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
}
.ccd-field-input input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 10px 0;
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 13px;
  color: #1C1917;
  outline: none;
}
.ccd-valid {
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
.ccd-valid.bad { background: #B91C1C; }

.ccd-map-table {
  border: 1px solid #E7E5E0;
  border-radius: 6px;
  overflow: hidden;
  background: #FFFFFF;
}
.ccd-map-header {
  display: grid;
  grid-template-columns: 1fr 14px 1fr 32px;
  padding: 8px 10px;
  background: #F5F5F4;
  border-bottom: 1px solid #E7E5E0;
  font-size: 10px;
  font-weight: 600;
  color: #57534E;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.ccd-map-header .l-h { color: #1D4ED8; }
.ccd-map-header .r-h { color: #7C3AED; }
.ccd-map-header .center { text-align: center; }
.ccd-map-row {
  display: grid;
  grid-template-columns: 1fr 14px 1fr 32px;
  padding: 8px 10px;
  align-items: center;
  border-bottom: 1px solid #E7E5E0;
  transition: background 0.1s;
}
.ccd-map-row:last-child { border-bottom: none; }
.ccd-map-row:hover { background: #FAFAF9; }
.ccd-map-row.is-key {
  background: linear-gradient(90deg, rgba(249, 115, 22, 0.04), rgba(249, 115, 22, 0.02));
}
.ccd-map-row.is-mismatch { background: #FEF2F2; }
.ccd-map-row.disabled { background: #FAFAF9; }
.ccd-map-row.disabled .ccd-map-field,
.ccd-map-row.disabled .ccd-map-arrow {
  color: #A8A29E;
  text-decoration: line-through;
  text-decoration-color: #A8A29E;
  text-decoration-thickness: 1px;
}
.ccd-map-row.disabled .ccd-map-field {
  background: #EFEEEC;
}
.ccd-key-checkbox {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: 1.5px solid #D6D3CD;
  background: #FFFFFF;
  display: grid;
  place-items: center;
  cursor: pointer;
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 9px;
  line-height: 1;
  color: white;
}
.ccd-key-checkbox.is-key {
  background: #F97316;
  border-color: #F97316;
}
.ccd-key-checkbox.is-key::before {
  content: '\u231C\u231D';
  letter-spacing: -2px;
}

/* KEY token \u9009\u62E9\u5668 - \u5728 01 \u57FA\u672C\u914D\u7F6E\u91CC */
.ccd-key-tokens {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}
.ccd-key-token {
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 11px;
  padding: 5px 10px;
  border-radius: 4px;
  background: #FAFAF9;
  border: 1px solid #E7E5E0;
  color: #57534E;
  cursor: pointer;
  transition: all 0.1s;
  font-weight: 500;
}
.ccd-key-token:hover { background: #EFEEEC; border-color: #D6D3CD; }
.ccd-key-token.is-key {
  background: #FFEDD5;
  border-color: #F97316;
  color: #C2410C;
  font-weight: 600;
}
.ccd-key-warn {
  margin-top: 8px;
  padding: 6px 10px;
  background: #FEF3C7;
  border: 1px solid #FCD34D;
  border-radius: 4px;
  font-size: 11px;
  color: #92400E;
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
}
.ccd-map-field {
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 12px;
  color: #1C1917;
  padding: 4px 8px;
  background: #F5F5F4;
  border-radius: 4px;
}
.ccd-map-field.r {
  background: rgba(13, 148, 136, 0.06);
  border: 1px solid rgba(13, 148, 136, 0.18);
}
.ccd-map-field.r.missing {
  background: rgba(220, 38, 38, 0.06);
  border-color: rgba(220, 38, 38, 0.3);
  color: #DC2626;
  text-decoration: line-through;
  text-decoration-color: rgba(220, 38, 38, 0.5);
}
.ccd-map-arrow {
  text-align: center;
  color: #D6D3CD;
  font-size: 12px;
}
.ccd-map-marker {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: white;
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 10px;
  font-weight: 700;
  margin: 0 auto;
}
.ccd-map-marker.matched { background: #0D9488; }
.ccd-map-marker.missing { background: #DC2626; }

.ccd-map-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}
.ccd-action-link {
  font-size: 11px;
  color: #0D9488;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  font-weight: 500;
}
.ccd-action-link:hover { background: #CCFBF1; }
.ccd-action-link.muted { color: #A8A29E; }
.ccd-action-link.muted:hover { background: #F5F5F4; color: #57534E; }
.ccd-map-count {
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 10px;
  color: #A8A29E;
  padding: 2px 6px;
  background: #F5F5F4;
  border-radius: 3px;
}
.ccd-empty-hint {
  font-size: 12px;
  color: #A8A29E;
  padding: 14px 12px;
  background: #FAFAF9;
  border: 1px dashed #E7E5E0;
  border-radius: 6px;
  text-align: center;
}

.ccd-toggle-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.ccd-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #FAFAF9;
  border: 1px solid #E7E5E0;
  border-radius: 6px;
  cursor: pointer;
}
.ccd-toggle.on {
  background: #FFFFFF;
  border-color: #D6D3CD;
}
.ccd-toggle-icon {
  width: 26px;
  height: 26px;
  border-radius: 5px;
  display: grid;
  place-items: center;
  color: white;
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}
.ccd-toggle-icon.add { background: #16A34A; }
.ccd-toggle-icon.del { background: #DC2626; }
.ccd-toggle-icon.mod { background: #F59E0B; }
.ccd-toggle-icon.same { background: #94A3B8; }
.ccd-toggle-text { flex: 1; }
.ccd-toggle-text .zh {
  font-size: 12px;
  font-weight: 600;
  color: #1C1917;
}
.ccd-toggle-text .en {
  font-size: 10px;
  color: #A8A29E;
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  margin-top: 2px;
}
.ccd-toggle-switch {
  width: 28px;
  height: 16px;
  border-radius: 8px;
  background: #D6D3CD;
  position: relative;
  flex-shrink: 0;
}
.ccd-toggle-switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: white;
  transition: transform 0.15s;
}
.ccd-toggle.on .ccd-toggle-switch { background: #0D9488; }
.ccd-toggle.on .ccd-toggle-switch::after { transform: translate(12px); }

.ccd-preview-block {
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
.ccd-preview-label {
  position: absolute;
  top: 8px;
  right: 10px;
  font-size: 9px;
  color: rgba(255, 255, 255, 0.3);
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.ccd-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: #FAFAF9;
  border-top: 1px solid #E7E5E0;
}
.ccd-footer-meta {
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 10.5px;
  color: #A8A29E;
}
.ccd-footer-meta .ok { color: #0D9488; }
.ccd-footer-meta .bad { color: #B91C1C; }
.ccd-footer-actions { display: flex; justify-content: space-between; gap: 8px; width: 100%; }
.ccd-footer-actions-right { display: flex; gap: 8px; }
.ccd-btn {
  padding: 7px 14px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid #D6D3CD;
  background: #FFFFFF;
  color: #57534E;
  cursor: pointer;
}
.ccd-btn:hover { background: #F5F5F4; }
.ccd-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.ccd-btn.primary {
  background: #1C1917;
  color: #FFFFFF;
  border-color: #1C1917;
}
.ccd-btn.primary:hover { background: #000; }
.ccd-btn.danger {
  color: #B91C1C;
  border-color: #FCA5A5;
  background: #FFFFFF;
}
.ccd-btn.danger:hover {
  background: #FEF2F2;
  border-color: #DC2626;
  color: #991B1B;
}
`;export{ge as default};
