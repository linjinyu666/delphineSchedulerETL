import{N as de,a as ue}from"./DrawerContent.e057fd97.js";import{N as pe}from"./Empty.1811a9c7.js";import{d as ge,D as me,g as h,a1 as fe,c as e,z as n}from"./index.e2a499a0.js";import{u as be}from"./use-message.21762cb2.js";import{N as T}from"./Select.467e6aa9.js";import{N as xe}from"./RadioGroup.5b42f21b.js";import{N as Y}from"./RadioButton.c38374a5.js";import{N as Fe}from"./Input.30f0b03e.js";import{N as W}from"./Switch.7c21fc85.js";import"./index.d814ba67.js";import"./flatten.dd0953ad.js";import"./Scrollbar.632c53f6.js";import"./VResizeObserver.7a362d95.js";import"./use-false-until-truthy.830dc8b2.js";import"./use-is-composing.b18d156a.js";import"./is-browser.45c3bd93.js";import"./use-merged-state.5f5f01e5.js";import"./index.3ef69258.js";import"./resolve-slot.8e13efbe.js";import"./format-length.d7d829b3.js";import"./cssr.4cb0a96a.js";import"./index.62f1e1b0.js";import"./next-frame-once.e5ee25e8.js";import"./use-locale.c60aec6e.js";import"./fade-in-scale-up.cssr.d770f4c4.js";import"./use-compitable.0fac5bfa.js";import"./use-form-item.f54209ce.js";import"./Popover.25d00aa8.js";import"./_baseMap.ab7431c2.js";import"./get.3de24c8f.js";import"./utils.c8c85f1b.js";import"./Suffix.4bfa7c94.js";import"./get-slot.80096ab3.js";import"./browser.7502e29f.js";const oo=ge({name:"CompareConfigDialog",props:{visible:{type:Boolean,default:!1},nodeId:{type:String,default:""},nodeLabel:{type:String,default:""},nodeConfig:{type:Object,default:()=>({})},upstreams:{type:Array,default:()=>[]}},emits:["update:visible","save","delete","close"],setup(d,{emit:D}){const b=be(),t=me({alias:"",srcId:"",tgtId:"",joinKeys:[],columns:[],outputMode:"src",output:{added:!0,deleted:!0,changed:!0,unchanged:!1,addedSymbol:"+",deletedSymbol:"-",changedSymbol:"~",unchangedSymbol:"="}}),v=h(()=>d.upstreams.find(o=>o.id===t.srcId)||d.upstreams[0]),k=h(()=>d.upstreams.find(o=>o.id===t.tgtId)||d.upstreams[1]||d.upstreams[0]),j=h(()=>{var c,a;const o=new Map;return(((c=v.value)==null?void 0:c.fields)||[]).forEach(i=>{if(!i||!i.name)return;const r=o.get(i.name)||{name:i.name,type:i.type||"STRING",src:!1,tgt:!1};r.src=!0,r.type=r.type||i.type||"STRING",o.set(i.name,r)}),(((a=k.value)==null?void 0:a.fields)||[]).forEach(i=>{if(!i||!i.name)return;const r=o.get(i.name)||{name:i.name,type:i.type||"STRING",src:!1,tgt:!1};r.tgt=!0,r.type=r.type||i.type||"STRING",o.set(i.name,r)}),Array.from(o.values())});fe(()=>{var c,a,i;if(!d.visible)return;const o=d.nodeConfig||{};if(t.alias=(o.alias||"compare1").toString(),t.srcId=(o.srcId||((c=d.upstreams[0])==null?void 0:c.id)||"").toString(),t.tgtId=(o.tgtId||((a=d.upstreams[1])==null?void 0:a.id)||((i=d.upstreams[0])==null?void 0:i.id)||"").toString(),t.outputMode=o.outputMode||"src",t.output={added:!0,deleted:!0,changed:!0,unchanged:!1,addedSymbol:"+",deletedSymbol:"-",changedSymbol:"~",unchangedSymbol:"=",...o.output||{}},Array.isArray(o.joinKeys)&&o.joinKeys.length>0)t.joinKeys=o.joinKeys.map(r=>({srcCol:(r.srcCol||"").trim(),tgtCol:(r.tgtCol||"").trim()})).filter(r=>r.srcCol||r.tgtCol);else if(typeof o.key=="string"&&o.key.trim()){const r=o.key.split(",").map(m=>m.trim()).filter(Boolean);t.joinKeys=r.map(m=>({srcCol:m,tgtCol:m}))}else t.joinKeys=[];Array.isArray(o.columns)&&o.columns.length>0?t.columns=o.columns.map(r=>({name:(r.name||r.srcField||"").toString(),srcField:(r.srcField||r.name||"").toString(),tgtField:(r.tgtField||r.name||"").toString(),type:r.type||"STRING",alias:r.alias||r.name,enabled:r.enabled!==!1,compare:r.compare!==!1})):t.columns=j.value.map(r=>({name:r.name,srcField:r.src?r.name:"",tgtField:r.tgt?r.name:"",type:r.type||"STRING",alias:r.name,enabled:!0,compare:!0}))});function P(){const o=t.srcId;t.srcId=t.tgtId,t.tgtId=o}function R(o){const c=o===1?d.upstreams[0]:d.upstreams[1],a=o===1?d.upstreams[1]:d.upstreams[0];!c||!a||(t.srcId=c.id,t.tgtId=a.id)}function O(o){R(o===1?2:1)}function V(){t.joinKeys=[...t.joinKeys||[],{srcCol:"",tgtCol:""}]}function q(o){t.joinKeys=(t.joinKeys||[]).filter((c,a)=>a!==o)}function K(o,c,a){!t.joinKeys||(t.joinKeys[o][c]=a)}function Z(){const c=j.value.find(a=>{var i;return!((i=t.columns)!=null&&i.some(r=>r.name===a.name))})||{name:"",type:"STRING"};t.columns=[...t.columns||[],{name:c.name||"",srcField:c.name||"",tgtField:c.name||"",type:c.type||"STRING",alias:c.name||"",enabled:!0,compare:!0}]}function Q(o){t.columns=(t.columns||[]).filter((c,a)=>a!==o)}function B(o,c){if(!!t.columns&&(t.columns[o]={...t.columns[o],...c},c.srcField!==void 0&&!t.columns[o].name&&(t.columns[o].name=c.srcField),c.srcField!==void 0||c.tgtField!==void 0)){const a=t.columns[o];(!a.alias||a.alias===a.name)&&(a.alias=a.srcField||a.tgtField||a.name),a.name||(a.name=a.srcField||a.tgtField||"")}}function X(o){t.output=t.output||{},t.output[o]=!t.output[o]}const ee={added:"+",deleted:"-",changed:"~",unchanged:"="},oe=["added","deleted","changed","unchanged"];function x(o){var a;const c=(a=t.output)==null?void 0:a[`${o}Symbol`];return c===void 0?ee[o]:c}function te(o,c){const a=c.replace(/\s/g,"").slice(0,3);t.output={...t.output||{},[`${o}Symbol`]:a}}function ce(o){var c,a;return o==="unchanged"?((c=t.output)==null?void 0:c.unchanged)===!0:((a=t.output)==null?void 0:a[o])!==!1}function y(o){return`'${o.replace(/'/g,"''")}'`}const w=h(()=>{const o=new Map;for(const c of t.columns||[]){const a=(c.alias||c.name||"").trim();c.enabled!==!1&&a&&o.set(a,(o.get(a)||0)+1)}return Array.from(o.entries()).filter(([,c])=>c>1).map(([c])=>c)}),J=h(()=>oe.filter(o=>!x(o).trim()));function G(){D("update:visible",!1),D("close")}function ne(){const o=(t.alias||"").trim();if(!o){b.error("\u8BF7\u586B\u5199\u8282\u70B9\u522B\u540D");return}if(!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(o)){b.error("\u522B\u540D\u53EA\u80FD\u5305\u542B\u5B57\u6BCD/\u6570\u5B57/\u4E0B\u5212\u7EBF\uFF0C\u4E14\u9996\u4F4D\u5FC5\u987B\u662F\u5B57\u6BCD");return}if(d.upstreams.length<2){b.error("\u8BF7\u8FDE\u5165 2 \u4E2A\u4E0A\u6E38\u8282\u70B9");return}if(!t.srcId||!t.tgtId){b.error("\u8BF7\u6307\u5B9A SRC / TGT \u89D2\u8272");return}if(J.value.length>0){b.error("\u5DEE\u5F02\u7B26\u53F7\u4E0D\u80FD\u4E3A\u7A7A");return}const c=(t.joinKeys||[]).filter(i=>i.srcCol||i.tgtCol);if(c.length===0){b.error("\u8BF7\u81F3\u5C11\u6DFB\u52A0 1 \u4E2A JOIN KEY \u914D\u5BF9");return}for(const i of c){if(!i.srcCol){b.error("JOIN KEY: SRC \u5B57\u6BB5\u672A\u6307\u5B9A");return}if(!i.tgtCol){b.error("JOIN KEY: TGT \u5B57\u6BB5\u672A\u6307\u5B9A");return}}const a=(t.columns||[]).filter(i=>i.srcField||i.tgtField);if(w.value.length>0){b.error(`\u8F93\u51FA\u5217\u540D\u91CD\u590D\uFF1A${w.value.join("\u3001")}`);return}D("save",JSON.parse(JSON.stringify({alias:o,srcId:t.srcId,tgtId:t.tgtId,joinKeys:c,columns:a,outputMode:t.outputMode||"src",output:t.output}))),G()}const ae=h(()=>{var r,m,f;let o=0;d.upstreams.length<2&&o++,(r=t.alias)!=null&&r.trim()||o++;const c=(t.joinKeys||[]).filter(g=>g.srcCol||g.tgtCol);c.length===0&&o++;const a=new Set((((m=v.value)==null?void 0:m.fields)||[]).map(g=>g.name)),i=new Set((((f=k.value)==null?void 0:f.fields)||[]).map(g=>g.name));for(const g of c)(!g.srcCol||!a.has(g.srcCol))&&o++,(!g.tgtCol||!i.has(g.tgtCol))&&o++;return o+=w.value.length,o+=J.value.length,o}),re=h(()=>{var A,S;if(d.upstreams.length<2)return"-- \u8BF7\u5148\u8FDE\u5165 2 \u4E2A\u4E0A\u6E38\u8282\u70B9";const o=((A=v.value)==null?void 0:A.alias)||"src",c=((S=k.value)==null?void 0:S.alias)||"tgt",a=(t.alias||"compare_out").trim(),i=(t.joinKeys||[]).filter(l=>l.srcCol&&l.tgtCol);if(i.length===0)return"-- \u8BF7\u914D\u7F6E\u81F3\u5C11 1 \u4E2A JOIN KEY \u914D\u5BF9";const r=(t.columns||[]).filter(l=>l.enabled&&(l.srcField||l.tgtField)),m=(t.columns||[]).filter(l=>l.compare!==!1&&l.srcField&&l.tgtField),f=[],g=t.outputMode||"src";for(const l of r){const F=(l.alias||l.name||l.srcField||l.tgtField||"").trim();!F||(g==="src"?l.srcField&&f.push(`${o}.${l.srcField} AS ${F}`):(l.srcField&&f.push(`${o}.${l.srcField} AS s_${F}`),l.tgtField&&f.push(`${c}.${l.tgtField} AS t_${F}`)))}if(g==="src")for(const l of r){const F=(l.alias||l.name||l.srcField||l.tgtField||"").trim();!F||!l.srcField&&l.tgtField&&f.push(`${c}.${l.tgtField} AS ${F}`)}const $=i.map(l=>`${o}.${l.srcCol} IS NULL`).join(" OR "),M=i.map(l=>`${c}.${l.tgtCol} IS NULL`).join(" AND ");let E=`WHEN ${$} THEN ${y(x("added"))}
`;if(E+=`    WHEN ${M} THEN ${y(x("deleted"))}
`,m.length>0){const l=m.map(F=>{const _=`${o}.${F.srcField}`,H=`${c}.${F.tgtField}`;return`(${_} <> ${H} OR (${_} IS NULL) <> (${H} IS NULL))`}).join(`
      OR `);E+=`    WHEN ${l} THEN ${y(x("changed"))}
`}E+=`    ELSE ${y(x("unchanged"))}`;const N=i.length===1?`COALESCE(${o}.${i[0].srcCol}, ${c}.${i[0].tgtCol}) AS cmp_id`:`CONCAT_WS('|', ${i.map(l=>`COALESCE(${o}.${l.srcCol}, '')`).join(", ")}) AS cmp_id`,s=i.map(l=>`${o}.${l.srcCol} = ${c}.${l.tgtCol}`).join(`
  AND `),u=t.output||{},p=[];u.added!==!1&&p.push(y(x("added"))),u.deleted!==!1&&p.push(y(x("deleted"))),u.changed!==!1&&p.push(y(x("changed"))),u.unchanged===!0&&p.push(y(x("unchanged")));const C=f.length>0?f.join(`,
  `):`${o}.*, ${c}.*`,I=`SELECT
  CASE
    ${E}
  END AS cmp_op,
  ${N},
  ${C}
FROM ${o} FULL OUTER JOIN ${c}
  ON ${s}`,z=p.length>0?`WHERE ${a}.cmp_op IN (${p.join(", ")})`:"";return`SELECT * FROM (
${I}
) AS ${a}
${z}`}),L=h(()=>{var o;return[...(((o=v.value)==null?void 0:o.fields)||[]).map(c=>({label:`${c.name} (${c.type||"STRING"})`,value:c.name}))]}),U=h(()=>{var o;return[...(((o=k.value)==null?void 0:o.fields)||[]).map(c=>({label:`${c.name} (${c.type||"STRING"})`,value:c.name}))]});function le(){t.columns=j.value.map(o=>({name:o.name,srcField:o.src?o.name:"",tgtField:o.tgt?o.name:"",type:o.type||"STRING",alias:o.name,enabled:!0,compare:!0})),b.success("\u5DF2\u7528\u4E0A\u6E38\u5B57\u6BB5\u5168\u91CF\u586B\u5145")}function ie(){for(const o of t.columns||[])o.compare=!0}function se(){for(const o of t.columns||[])o.compare=!1}return()=>e(de,{show:d.visible,width:760,placement:"right",onUpdateShow:o=>D("update:visible",o)},{default:()=>[e(ue,{title:`\u6570\u636E\u6BD4\u5BF9 \xB7 ${t.alias||"\u672A\u547D\u540D"}`,closable:!0},{default:()=>{var o,c,a,i,r,m,f,g,$,M,E,N;return[e(he,null,null),e("div",{class:"ccd-drawer"},[e("div",{class:"ccd-section"},[e("div",{class:"ccd-section-num"},[n("01")]),e("div",{class:"ccd-section-title"},[n("\u57FA\u672C\u4FE1\u606F")]),e("div",{class:"ccd-basic-row"},[e("label",{class:"ccd-basic-label"},[n("\u8282\u70B9\u540D\u79F0(\u522B\u540D) "),e("span",null,[n("*")])]),e("div",{class:"ccd-field-input"},[e("input",{value:t.alias,onInput:s=>t.alias=s.target.value,placeholder:"\u4F8B\u5982 compare1"},null)])]),e("div",{class:"ccd-basic-row"},[e("span",{class:"ccd-basic-label"},[n("\u7C7B\u578B")]),e("span",{class:"ccd-type-tag"},[n("compare")])])]),e("div",{class:"ccd-upstream"},[e("div",{class:"ccd-up-card"},[e("div",{class:"ccd-up-role"},[e("button",{class:`up-role-btn ${t.srcId===((o=d.upstreams[0])==null?void 0:o.id)?"active src":""}`,onClick:()=>R(1)},[n("SRC")]),e("button",{class:`up-role-btn ${t.tgtId===((c=d.upstreams[0])==null?void 0:c.id)?"active tgt":""}`,onClick:()=>O(1)},[n("TGT")])]),e("span",{class:"ccd-up-alias"},[((a=d.upstreams[0])==null?void 0:a.alias)||"?"]),e("span",{class:"ccd-up-fields"},[((r=(i=d.upstreams[0])==null?void 0:i.fields)==null?void 0:r.length)||0,n(" \u5B57\u6BB5")])]),e("button",{class:"ccd-swap",onClick:P,title:"\u4EA4\u6362\u6E90/\u76EE\u6807"},[n("\u21C4")]),e("div",{class:"ccd-up-card"},[e("div",{class:"ccd-up-role"},[e("button",{class:`up-role-btn ${t.srcId===((m=d.upstreams[1])==null?void 0:m.id)?"active src":""}`,onClick:()=>R(2)},[n("SRC")]),e("button",{class:`up-role-btn ${t.tgtId===((f=d.upstreams[1])==null?void 0:f.id)?"active tgt":""}`,onClick:()=>O(2)},[n("TGT")])]),e("span",{class:"ccd-up-alias"},[((g=d.upstreams[1])==null?void 0:g.alias)||"?"]),e("span",{class:"ccd-up-fields"},[((M=($=d.upstreams[1])==null?void 0:$.fields)==null?void 0:M.length)||0,n(" \u5B57\u6BB5")])])]),e("div",{class:"ccd-section"},[e("div",{class:"ccd-section-num"},[n("02")]),e("div",{class:"ccd-section-title"},[n("JOIN ON \u5B57\u6BB5\u914D\u5BF9")]),e("div",{class:"ccd-section-hint"},[n("\u51B3\u5B9A\u4E24\u8868\u7528\u4EC0\u4E48\u5B57\u6BB5\u5173\u8054 \xB7 \u652F\u6301\u591A KEY \u914D\u5BF9 \xB7 \u540C\u540D\u5B57\u6BB5\u53EF\u76F4\u63A5\u7528 \u2191 \u5FEB\u6377\u590D\u5236")]),e("div",{class:"ccd-key-table"},[e("div",{class:"ccd-key-row ccd-key-header"},[e("span",{class:"c-idx"},[n("#")]),e("span",{class:"c-src"},[n("SRC."),(E=v.value)==null?void 0:E.alias]),e("span",{class:"c-arrow"},[n("=")]),e("span",{class:"c-tgt"},[n("TGT."),(N=k.value)==null?void 0:N.alias]),e("span",{class:"c-op"},null)]),(t.joinKeys||[]).map((s,u)=>{var I,z,A,S;const p=s.srcCol&&!((z=(I=v.value)==null?void 0:I.fields)!=null&&z.some(l=>l.name===s.srcCol)),C=s.tgtCol&&!((S=(A=k.value)==null?void 0:A.fields)!=null&&S.some(l=>l.name===s.tgtCol));return e("div",{key:"jk_"+u,class:"ccd-key-row"},[e("span",{class:"c-idx"},[u+1]),e("span",{class:"c-src"},[e(T,{value:s.srcCol||null,options:L.value,placeholder:"\u9009 SRC \u5B57\u6BB5",filterable:!0,clearable:!0,size:"small","onUpdate:value":l=>K(u,"srcCol",l)},null),p&&e("span",{class:"ccd-mini-warn"},[n("\u26A0 \u5DF2\u5931\u6548")])]),e("span",{class:"c-arrow"},[n("=")]),e("span",{class:"c-tgt"},[e(T,{value:s.tgtCol||null,options:U.value,placeholder:"\u9009 TGT \u5B57\u6BB5",filterable:!0,clearable:!0,size:"small","onUpdate:value":l=>K(u,"tgtCol",l)},null),C&&e("span",{class:"ccd-mini-warn"},[n("\u26A0 \u5DF2\u5931\u6548")])]),e("span",{class:"c-op"},[e("button",{class:"ccd-icon-btn",title:"\u628A SRC \u5B57\u6BB5\u540D\u540C\u6B65\u5230 TGT(\u540C\u540D\u5B57\u6BB5\u5FEB\u6377)",onClick:()=>K(u,"tgtCol",s.srcCol)},[n("\u2191")]),e("button",{class:"ccd-icon-btn danger",title:"\u5220\u9664\u8FD9\u4E00\u5BF9",onClick:()=>q(u)},[n("\xD7")])])])}),e("button",{class:"ccd-add-row",onClick:V},[n("+ \u6DFB\u52A0 JOIN KEY \u914D\u5BF9")])])]),e("div",{class:"ccd-section"},[e("div",{class:"ccd-section-num"},[n("03")]),e("div",{class:"ccd-section-title"},[n("\u8F93\u51FA\u5217\uFF08\u53EF\u7F16\u8F91\uFF09")]),e("div",{class:"ccd-section-hint"},[n("\u8F93\u51FA\u522B\u540D\u51B3\u5B9A\u4E0B\u6E38\u5B57\u6BB5\u540D \xB7 \u9009\u62E9 SRC/TGT \u6765\u6E90 \xB7 \u201C\u6BD4\u5BF9\u201D\u5F00\u5173\u51B3\u5B9A\u662F\u5426\u53C2\u4E0E\u4FEE\u6539\u5224\u5B9A")]),e("div",{class:"ccd-output-mode"},[e("span",{class:"ccd-mode-label"},[n("\u8F93\u51FA\u6A21\u5F0F")]),e(xe,{value:t.outputMode||"src","onUpdate:value":s=>t.outputMode=s,size:"small"},{default:()=>[e(Y,{value:"src"},{default:()=>[n("\u53EA\u8F93\u51FA SRC"),e("span",{class:"ccd-mode-hint"},[n("\xB7 \u63A8\u8350 \xB7 \u5DEE\u5F02\u884C TGT \u7F3A\u5931\u663E\u793A NULL")])]}),e(Y,{value:"both"},{default:()=>[n("\u540C\u65F6\u8F93\u51FA SRC + TGT"),e("span",{class:"ccd-mode-hint"},[n("\xB7 s_xxx / t_xxx \u53CC\u4EFD")])]})]})]),!t.columns||t.columns.length===0?e(pe,{size:"small",description:"\u6682\u65E0\u5217 \xB7 \u70B9\u4E0B\u65B9\u6309\u94AE\u6DFB\u52A0"},null):e("div",{class:"ccd-col-table"},[e("div",{class:"ccd-col-row ccd-col-header"},[e("span",{class:"c-name"},[n("\u8F93\u51FA\u522B\u540D")]),e("span",{class:"c-src"},[n("SRC \u5B57\u6BB5")]),e("span",{class:"c-tgt"},[n("TGT \u5B57\u6BB5")]),e("span",{class:"c-out"},[n("\u8F93\u51FA")]),e("span",{class:"c-cmp"},[n("\u6BD4\u5BF9")]),e("span",{class:"c-op"},null)]),t.columns.map((s,u)=>e("div",{key:"col_"+u,class:`ccd-col-row ${s.enabled?"":"disabled"} ${w.value.includes(s.alias||s.name||"")?"duplicate":""}`},[e("span",{class:"c-name"},[e(Fe,{value:s.alias||"",placeholder:"\u8F93\u51FA\u5217\u540D",size:"small","onUpdate:value":p=>B(u,{alias:p,name:p})},null)]),e("span",{class:"c-src"},[e(T,{value:s.srcField||null,options:L.value,placeholder:"\u2014 \u4E0D\u53D6 \u2014",filterable:!0,clearable:!0,size:"small","onUpdate:value":p=>B(u,{srcField:p||""})},null)]),e("span",{class:"c-tgt"},[e(T,{value:s.tgtField||null,options:U.value,placeholder:"\u2014 \u4E0D\u53D6 \u2014",filterable:!0,clearable:!0,size:"small","onUpdate:value":p=>B(u,{tgtField:p||""})},null)]),e("span",{class:"c-out"},[e(W,{value:s.enabled!==!1,size:"small","onUpdate:value":p=>B(u,{enabled:p})},null)]),e("span",{class:"c-cmp"},[e(W,{value:s.compare!==!1,size:"small",disabled:!s.srcField||!s.tgtField,"onUpdate:value":p=>B(u,{compare:p})},null)]),e("span",{class:"c-op"},[e("button",{class:"ccd-icon-btn danger",title:"\u5220\u9664\u8FD9\u4E00\u5217",onClick:()=>Q(u)},[n("\xD7")])])]))]),w.value.length>0&&e("div",{class:"ccd-inline-error"},[n("\u8F93\u51FA\u522B\u540D\u91CD\u590D\uFF1A"),w.value.join("\u3001"),n("\uFF0C\u8BF7\u4FEE\u6539\u540E\u518D\u4FDD\u5B58")]),e("div",{class:"ccd-col-actions"},[e("button",{class:"ccd-action-link",onClick:Z},[n("+ \u6DFB\u52A0\u5217")]),e("button",{class:"ccd-action-link",onClick:le},[n("\u2191 \u7528\u4E0A\u6E38\u5B57\u6BB5\u5168\u91CF\u586B\u5145")]),e("span",{class:"ccd-divider-v"},null),e("button",{class:"ccd-action-link",onClick:ie},[n("\u5168\u9009\u6BD4\u5BF9")]),e("button",{class:"ccd-action-link muted",onClick:se},[n("\u6E05\u7A7A\u6BD4\u5BF9")]),e("span",{class:"ccd-col-count"},[(t.columns||[]).filter(s=>s.enabled).length,n(" / "),(t.columns||[]).length,n(" \u8F93\u51FA \xB7")," ",(t.columns||[]).filter(s=>s.compare!==!1&&s.srcField&&s.tgtField).length,n(" \u53C2\u4E0E\u6BD4\u5BF9")])])]),e("div",{class:"ccd-section"},[e("div",{class:"ccd-section-num"},[n("04")]),e("div",{class:"ccd-section-title"},[n("\u8F93\u51FA\u54EA\u4E9B\u5DEE\u5F02\u884C")]),e("div",{class:"ccd-section-hint"},[n("\u9009\u62E9\u8981\u8F93\u51FA\u7684\u5DEE\u5F02\u7C7B\u578B\uFF0C\u5E76\u4E3A\u6BCF\u79CD\u7C7B\u578B\u8BBE\u7F6E cmp_op \u7B26\u53F7")]),e("div",{class:"ccd-toggle-grid"},[[["added","\u65B0\u589E","TGT \u5B58\u5728\uFF0CSRC \u65E0"],["deleted","\u5220\u9664","SRC \u5B58\u5728\uFF0CTGT \u65E0"],["changed","\u4FEE\u6539","\u4E24\u4FA7\u5185\u5BB9\u4E0D\u4E00\u81F4"],["unchanged","\u4E00\u81F4","\u4E24\u4FA7\u5185\u5BB9\u5B8C\u5168\u76F8\u540C"]].map(([s,u,p])=>e("div",{key:s,class:`ccd-toggle ${ce(s)?"on":""}`,onClick:()=>X(s)},[e("input",{class:"ccd-toggle-symbol",value:x(s),"aria-label":`${u}\u7B26\u53F7`,maxLength:3,onClick:C=>C.stopPropagation(),onInput:C=>te(s,C.target.value)},null),e("div",{class:"ccd-toggle-text"},[e("div",{class:"zh"},[u]),e("div",{class:"en"},[p])]),e("div",{class:"ccd-toggle-switch"},null)]))]),J.value.length>0&&e("div",{class:"ccd-inline-error"},[n("\u5DEE\u5F02\u7B26\u53F7\u4E0D\u80FD\u4E3A\u7A7A\uFF0C\u8BF7\u4E3A\u6BCF\u79CD\u5DEE\u5F02\u7C7B\u578B\u586B\u5199\u7B26\u53F7")])]),e("div",{class:"ccd-section"},[e("div",{class:"ccd-section-num"},[n("05")]),e("div",{class:"ccd-section-title"},[n("SQL \u9884\u89C8")]),e("div",{class:"ccd-section-hint"},[n("\u4E0B\u6E38\u9884\u89C8\u8282\u70B9\u5C06\u4F5C\u4E3A\u5B50\u67E5\u8BE2\u6D88\u8D39\u6B64\u7ED3\u679C")]),e("pre",{class:"ccd-preview-block"},[e("span",{class:"ccd-preview-label"},[n("LIVE")]),re.value])]),e("div",{class:"ccd-footer"},[e("div",{class:"ccd-footer-actions"},[e("div",{class:"ccd-footer-actions-right"},[e("button",{class:"ccd-btn",onClick:G},[n("\u53D6\u6D88")]),e("button",{class:"ccd-btn primary",onClick:ne,disabled:ae.value>0},[n("\u4FDD\u5B58")])])])])])]}})]})}});function he(){return e("style",null,[ye])}const ye=`
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
  margin: 0 14px 16px;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}
.ccd-section-num {
  display: none;
}
.ccd-section-title {
  color: #1f2937;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0;
  line-height: 20px;
}
.ccd-section-hint {
  margin: 2px 0 12px;
  color: #94a3b8;
  font-size: 12px;
  line-height: 18px;
}

.ccd-identity-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  max-width: 320px;
}
.ccd-field-input {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  border: 1px solid #d9e2ef;
  border-radius: 6px;
  padding: 0 10px;
  transition: all 0.15s;
}
.ccd-field-input:focus-within {
  border-color: #288fff;
  box-shadow: 0 0 0 2px rgba(40, 143, 255, 0.12);
  background: #fff;
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

/* \u57FA\u672C\u4FE1\u606F\u7EDF\u4E00\u4E3A\u6807\u7B7E\u4E0E\u5185\u5BB9\u540C\u884C\u3001\u8282\u70B9\u7C7B\u578B\u5355\u72EC\u4E00\u884C */
.ccd-basic-row {
  display: grid;
  grid-template-columns: 118px minmax(0, 1fr);
  column-gap: 12px;
  align-items: center;
  margin-bottom: 8px;
}
.ccd-basic-label {
  color: #475569;
  font-size: 13px;
  line-height: 18px;
}
.ccd-basic-label span { color: #ef4444; }
.ccd-basic-row .ccd-field-input {
  max-width: none;
  min-width: 0;
}
.ccd-type-tag {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  min-height: 26px;
  padding: 3px 10px;
  border: 1px solid #93c5fd;
  border-radius: 4px;
  color: #2563eb;
  background: #eff6ff;
  font-size: 12px;
  line-height: 18px;
}

/* JOIN KEY \u8868\u683C */
.ccd-key-table {
  border: 1px solid #E7E5E0;
  border-radius: 6px;
  overflow: hidden;
  background: #FFFFFF;
}
.ccd-key-row {
  display: grid;
  grid-template-columns: 30px 1fr 24px 1fr 80px;
  gap: 8px;
  padding: 8px 10px;
  align-items: center;
  border-bottom: 1px solid #E7E5E0;
}
.ccd-key-row:last-of-type { border-bottom: none; }
.ccd-key-header {
  background: #F5F5F4;
  font-size: 10px;
  font-weight: 600;
  color: #57534E;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.ccd-key-header .c-src { color: #1D4ED8; }
.ccd-key-header .c-tgt { color: #7C3AED; }
.ccd-key-row .c-idx {
  font-family: 'SF Mono', Menlo, monospace;
  font-size: 11px;
  color: #A8A29E;
  text-align: center;
}
.ccd-key-row .c-arrow {
  text-align: center;
  color: #D6D3CD;
  font-size: 14px;
  font-weight: 700;
}
.ccd-key-row .c-op {
  display: flex;
  gap: 4px;
  justify-content: flex-end;
}
.ccd-mini-warn {
  font-size: 10px;
  color: #B91C1C;
  font-family: 'SF Mono', Menlo, monospace;
  margin-left: 4px;
}
.ccd-icon-btn {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  background: #FAFAF9;
  border: 1px solid #E7E5E0;
  color: #57534E;
  cursor: pointer;
  font-size: 13px;
  display: grid;
  place-items: center;
}
.ccd-icon-btn:hover { background: #EFEEEC; }
.ccd-icon-btn.danger:hover { background: #FEE2E2; color: #B91C1C; border-color: #FCA5A5; }
.ccd-add-row {
  display: block;
  width: 100%;
  background: #FAFAF9;
  border: none;
  border-top: 1px dashed #E7E5E0;
  padding: 10px;
  color: #0D9488;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}
.ccd-add-row:hover { background: #F0FDFA; color: #0F766E; }

/* \u8F93\u51FA\u5217\u8868\u683C */
.ccd-col-table {
  border: 1px solid #E7E5E0;
  border-radius: 6px;
  overflow: hidden;
  background: #FFFFFF;
}

/* \u8F93\u51FA\u6A21\u5F0F\u5207\u6362 */
.ccd-output-mode {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: linear-gradient(90deg, rgba(13, 148, 136, 0.04), rgba(13, 148, 136, 0.01));
  border: 1px solid rgba(13, 148, 136, 0.18);
  border-radius: 6px;
  margin-bottom: 12px;
}
.ccd-mode-label {
  font-size: 11px;
  color: #57534E;
  font-weight: 600;
  flex-shrink: 0;
}
.ccd-mode-hint {
  margin-left: 4px;
  font-size: 10px;
  color: #A8A29E;
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-weight: 400;
}
.ccd-col-row {
  display: grid;
  grid-template-columns: 130px 1fr 1fr 60px 60px 36px;
  gap: 8px;
  padding: 8px 10px;
  align-items: center;
  border-bottom: 1px solid #E7E5E0;
}
.ccd-col-row:last-of-type { border-bottom: none; }
.ccd-col-header {
  background: #F5F5F4;
  font-size: 10px;
  font-weight: 600;
  color: #57534E;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.ccd-col-row.disabled { background: #FAFAF9; }
.ccd-col-row.disabled .c-name { opacity: 0.5; }
.ccd-col-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  flex-wrap: wrap;
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
.ccd-divider-v {
  width: 1px;
  height: 12px;
  background: #E7E5E0;
  margin: 0 4px;
}
.ccd-col-count {
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 10px;
  color: #A8A29E;
  padding: 2px 6px;
  background: #F5F5F4;
  border-radius: 3px;
  margin-left: auto;
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

/* \u4E0E\u5176\u5B83\u8282\u70B9\u62BD\u5C49\u4FDD\u6301\u4E00\u81F4\uFF1A\u6D45\u8272\u753B\u5E03\u3001\u767D\u8272\u5361\u7247\u3001\u7D27\u51D1\u95F4\u8DDD\u3002 */
.ccd-drawer {
  padding: 0 16px 20px;
  background: #f7f8fa;
  background-image: none;
}
.ccd-header {
  padding: 0 0 12px;
  border-bottom: 0;
}
.ccd-node-chip,
.ccd-header-title {
  display: none;
}
.ccd-header-left {
  min-width: 0;
}
.ccd-header-sub {
  margin-top: 0;
  color: #64748b;
  font-size: 12px;
  font-family: inherit;
}
.ccd-header-right {
  gap: 8px;
}
.ccd-status-tag {
  border: 1px solid #99f6e4;
  border-radius: 4px;
  background: #f0fdfa;
  color: #0f766e;
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
}
.ccd-status-tag.bad {
  border-color: #fecaca;
  background: #fef2f2;
  color: #b91c1c;
}
.ccd-upstream {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 32px minmax(0, 1fr);
  gap: 8px;
  margin: 0 0 16px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}
.ccd-up-card {
  min-width: 0;
  padding: 8px 10px;
  border-color: #e5e7eb;
  background: #f8fafc;
}
.ccd-up-alias,
.ccd-up-fields {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ccd-swap {
  align-self: center;
  justify-self: center;
  width: 28px;
  height: 28px;
  border-color: #cbd5e1;
  color: #2563eb;
  background: #fff;
}
.ccd-swap:hover {
  background: #eff6ff;
  border-color: #93c5fd;
}
.ccd-section {
  margin: 0 0 16px;
  padding: 14px;
  border-color: #e5e7eb;
  border-radius: 8px;
  background: #fff;
}
.ccd-section-title {
  margin-bottom: 2px;
}
.ccd-section-hint {
  margin: 0 0 10px;
  color: #64748b;
}
.ccd-key-row,
.ccd-col-row {
  padding: 7px 8px;
  gap: 6px;
}
.ccd-key-row {
  grid-template-columns: 24px minmax(0, 1fr) 20px minmax(0, 1fr) 58px;
}
.ccd-col-row {
  grid-template-columns: 110px minmax(0, 1fr) minmax(0, 1fr) 48px 48px 28px;
}
.ccd-key-table,
.ccd-col-table {
  border-color: #e2e8f0;
}
.ccd-key-header,
.ccd-col-header {
  background: #f8fafc;
  color: #475569;
}
.ccd-output-mode {
  padding: 8px 10px;
  margin-bottom: 10px;
  border-color: #dbeafe;
  background: #f8fbff;
}
.ccd-mode-hint {
  display: none;
}
.ccd-toggle-grid {
  gap: 8px;
}
.ccd-toggle {
  padding: 8px 10px;
  gap: 8px;
}
.ccd-toggle-icon {
  width: 24px;
  height: 24px;
}
.ccd-toggle-text .en {
  color: #94a3b8;
}
.ccd-footer {
  margin: 0;
  padding: 0;
  border-top: 0;
  background: transparent;
}
.ccd-footer-actions {
  align-items: center;
  justify-content: flex-end;
}
.ccd-footer-meta {
  color: #64748b;
}
.ccd-btn {
  border-radius: 6px;
}
.ccd-btn.primary {
  background: #2080f0;
  border-color: #2080f0;
}
.ccd-btn.primary:hover {
  background: #4098f7;
  border-color: #4098f7;
}
.ccd-key-table .n-base-selection-label,
.ccd-col-table .n-base-selection-label,
.ccd-col-table .n-input__input {
  font-size: 12px !important;
}
.ccd-key-table .n-base-selection,
.ccd-col-table .n-base-selection {
  min-height: 30px;
}
.ccd-key-row,
.ccd-col-row {
  font-size: 12px;
}
.ccd-key-row .c-src,
.ccd-key-row .c-tgt,
.ccd-col-row .c-src,
.ccd-col-row .c-tgt {
  min-width: 0;
}
.ccd-inline-error {
  margin-top: 8px;
  padding: 7px 10px;
  border: 1px solid #fecaca;
  border-radius: 6px;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 12px;
}
.ccd-col-row.duplicate {
  background: #fff7f7;
}
.ccd-col-row.duplicate .n-input {
  border-color: #fca5a5;
}
.ccd-toggle {
  background: #f8fafc;
  border-color: #e2e8f0;
}
.ccd-toggle:hover {
  border-color: #bfdbfe;
  background: #f8fbff;
}
.ccd-toggle.on {
  background: #f8fbff;
  border-color: #93c5fd;
}
.ccd-toggle-symbol {
  width: 30px;
  height: 28px;
  padding: 0;
  border: 1px solid #cbd5e1;
  border-radius: 5px;
  background: #fff;
  color: #334155;
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 16px;
  font-weight: 600;
  text-align: center;
  outline: none;
}
.ccd-toggle-symbol:focus {
  border-color: #60a5fa;
  box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.16);
}
.ccd-toggle.on .ccd-toggle-symbol {
  border-color: #93c5fd;
  color: #1d4ed8;
}
.ccd-toggle.on .ccd-toggle-switch {
  background: #2563eb;
}
`;export{oo as default};
