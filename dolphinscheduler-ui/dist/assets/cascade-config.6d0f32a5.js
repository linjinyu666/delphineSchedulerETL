import{f as re,h as ce,i as de,j as pe}from"./index.7e330b8b.js";import{d as fe,r as p,g as B,G as E,c as l,z as o,h as A,a2 as me}from"./index.e2a499a0.js";import{N as z,d as S}from"./Select.467e6aa9.js";import{N as T}from"./Spin.378d7d79.js";import{N as k}from"./Empty.1811a9c7.js";import{N as ve}from"./Space.33d2005a.js";import{N as U}from"./Button.5289311a.js";import{N as ge}from"./DataTable.775b1ef3.js";import"./service.a1d4770e.js";import"./ui-setting.cbbf8244.js";import"./lodash.aa74671d.js";import"./fade-in-scale-up.cssr.d770f4c4.js";import"./use-merged-state.5f5f01e5.js";import"./use-locale.c60aec6e.js";import"./use-compitable.0fac5bfa.js";import"./use-form-item.f54209ce.js";import"./Scrollbar.632c53f6.js";import"./VResizeObserver.7a362d95.js";import"./resolve-slot.8e13efbe.js";import"./cssr.4cb0a96a.js";import"./Popover.25d00aa8.js";import"./index.d814ba67.js";import"./flatten.dd0953ad.js";import"./use-false-until-truthy.830dc8b2.js";import"./_baseMap.ab7431c2.js";import"./get.3de24c8f.js";import"./utils.c8c85f1b.js";import"./format-length.d7d829b3.js";import"./next-frame-once.e5ee25e8.js";import"./Suffix.4bfa7c94.js";import"./index.62f1e1b0.js";import"./index.3ef69258.js";import"./is-browser.45c3bd93.js";import"./get-slot.80096ab3.js";import"./browser.7502e29f.js";import"./ArrowDown.879122e5.js";import"./Checkbox.487a47ec.js";import"./RadioGroup.5b42f21b.js";import"./Radio.34d7c035.js";import"./Dropdown.9dd2d14f.js";import"./Icon.a3fc0ddd.js";import"./ChevronRight.cf81aac9.js";import"./use-keyboard.2fb9826f.js";import"./Ellipsis.50be4cc6.js";import"./Tooltip.7d3e32b7.js";import"./Input.30f0b03e.js";import"./Forward.36751c31.js";import"./keysOf.ab13e590.js";function V(v){return String(v||"STRING").trim().toUpperCase().replace(/\s+UNSIGNED\b/g,"")||"STRING"}const da=fe({name:"CascadeConfig",props:{modelValue:{type:Object,required:!0},mode:{type:String,default:"source"}},emits:["update:modelValue","change"],setup(v,{emit:D}){var H,Q,Z,J,W,X,ee,ae,le;const g=p((Q=(H=v.modelValue)==null?void 0:H.dsType)!=null?Q:null),s=p((J=(Z=v.modelValue)==null?void 0:Z.dsId)!=null?J:null),d=p((X=(W=v.modelValue)==null?void 0:W.database)!=null?X:null),m=p((ae=(ee=v.modelValue)==null?void 0:ee.table)!=null?ae:null),L=e=>Array.isArray(e)?e.map(a=>typeof a=="string"?a:(a==null?void 0:a.name)||(a==null?void 0:a.value)||"").map(a=>String(a||"").trim()).filter(Boolean):[],t=p(L((le=v.modelValue)==null?void 0:le.columns)),P=p([]),w=p([]),x=p([]),h=p([]),u=p([]);p(!1);const I=p(!1),_=p(!1),R=p(!1),F=p(!1),te=B(()=>new Set(t.value).size),G=B(()=>u.value.filter(e=>e._primary).length),q=B(()=>u.value.filter(e=>e._primary).map(e=>String(e.value))),O=()=>{const e=q.value;if(e.length===0)return;const a=Array.from(new Set([...e,...t.value]));(a.length!==t.value.length||a.some((n,i)=>n!==t.value[i]))&&(t.value=a)},ie=["MYSQL","POSTGRESQL","HIVE","CLICKHOUSE","ORACLE","DAMENG","SQLSERVER","DB2","PRESTO","REDSHIFT","ATHENA","TRINO","STARROCKS","AZURESQL","DAMENG","OCEANBASE","KYUUBI","DATABEND","VERTICA","HANA","DORIS","DOLPHINDB"];P.value=ie.map(e=>({label:e,value:e}));const b=()=>{var a;O();const e=t.value.map(n=>{if(typeof n=="string"){const i=u.value.find(r=>r.value===n);return{name:n,type:V((i==null?void 0:i._type)||"STRING"),primary:!!(i&&i._primary)}}return{...n,type:V(n.type||n.dataType||"STRING")}});D("update:modelValue",{dsType:g.value,dsId:s.value,datasourceAlias:((a=w.value.find(n=>n.value===s.value))==null?void 0:a.label)||String(s.value||""),database:d.value,table:m.value,columns:e}),D("change")},N=()=>{d.value=null,m.value=null,t.value=[],x.value=[],h.value=[],u.value=[]},Y=async e=>{I.value=!0;try{const a=await re({type:e});w.value=(a||[]).map(n=>({label:n.name,value:n.id}))}catch{w.value=[]}finally{I.value=!1}},$=async e=>{_.value=!0,x.value=[];try{const a=await ce(e),n=Array.isArray(a)?a:a&&Array.isArray(a.data)?a.data:[];x.value=n.map(i=>typeof i=="string"?{label:i,value:i}:{label:i.label||i.value,value:i.value})}catch{x.value=[]}finally{_.value=!1}},K=async(e,a)=>{R.value=!0,h.value=[];try{const n=await de(e,a);h.value=(n||[]).map(i=>typeof i=="string"?{label:i,value:i}:{label:i.label||i.value,value:i.value})}catch{h.value=[]}finally{R.value=!1}},M=async(e,a,n)=>{F.value=!0,u.value=[];try{const i=await pe(e,a,n);u.value=(i||[]).map(r=>{const y=typeof r=="string"?r:r.label||r.value,C=(typeof r=="string"?r:r.value||y).trim().split(/\s+/)[0],f=ne(y);return{label:y,value:C,_name:f.name,_type:V(f.size?`${f.type}(${f.size})`:f.type),_primary:f.primary,_nullable:f.nullable,_comment:f.comment}}),t.value.length===0&&(t.value=u.value.map(r=>String(r.value))),O()}catch{u.value=[]}finally{F.value=!1}},ne=e=>{const a={name:e,type:"",size:"",primary:!1,nullable:!0,comment:""},n=e.trim(),i=/\[([^\]]*)\]/g,r=[];let y=n.replace(i,(f,c)=>(r.push(c),"")).trim();const C=y.match(/^(\S+)\s+(.+)$/);if(C){a.name=C[1];const c=C[2].trim().replace(/\s+UNSIGNED\b/ig,"").match(/^([A-Za-z][A-Za-z0-9_]*)(?:\((\d+)(?:,(\d+))?\))?$/);c&&(a.type=c[1],c[2]!=null&&(a.size=c[3]!=null?`${c[2]},${c[3]}`:c[2]))}else a.name=y;for(const f of r){const c=f.toUpperCase().trim();c==="NULL"?a.nullable=!0:c==="NOT NULL"?a.nullable=!1:c==="PK"||c==="PRIMARY KEY"||c==="PRIMARY_KEY"||c==="PRIMARYKEY"?a.primary=!0:a.comment=(a.comment?a.comment+" ":"")+f}return a};E(g,async e=>{if(!e){w.value=[],N(),b();return}s.value=null,N(),await Y(e),b()}),E(s,async e=>{if(!e){x.value=[],N(),b();return}N(),await $(e),b()}),E(d,async e=>{if(!e||!s.value){h.value=[],m.value=null,t.value=[],u.value=[],b();return}m.value=null,t.value=[],h.value=[],u.value=[],await K(s.value,e),b()}),E(m,async e=>{if(!e||!s.value||!d.value){u.value=[],t.value=[],b();return}t.value=[],u.value=[],await M(s.value,d.value,e)}),E(()=>v.modelValue,e=>{var n,i,r,y;if(!e)return;g.value=(n=e.dsType)!=null?n:null,s.value=(i=e.dsId)!=null?i:null,d.value=(r=e.database)!=null?r:null,m.value=(y=e.table)!=null?y:null;const a=L(e.columns);JSON.stringify(a)!==JSON.stringify(t.value)&&(t.value=a)},{deep:!0}),E(t,()=>b(),{deep:!0}),g.value&&Y(g.value),s.value&&$(s.value),s.value&&d.value&&K(s.value,d.value),s.value&&d.value&&m.value&&M(s.value,d.value,m.value);const oe=B(()=>[{title:"\u72B6\u6001",key:"selected",width:72,render:e=>e._primary?A(S,{type:"warning",size:"small",bordered:!1},{default:()=>"\u5FC5\u9009"}):t.value.includes(e.value)?A(S,{type:"success",size:"small",bordered:!1},{default:()=>"\u5DF2\u9009"}):A("span",{class:"cascade-field-unselected"},"\u672A\u9009")},{title:"\u5B57\u6BB5\u540D",key:"name",minWidth:150,render:e=>A("span",{class:e._primary?"cascade-field-primary-name":""},e._name)},{title:"\u7C7B\u578B",key:"type",render:e=>e._type||"-"},{title:"\u662F\u5426\u4E3B\u952E",key:"primary",width:90,render:e=>e._primary?A(S,{type:"primary",size:"small",bordered:!1},{default:()=>"\u4E3B\u952E \xB7 \u5FC5\u9009"}):A("span",{class:"cascade-field-muted"},"\u5426")}]);if(typeof document<"u"&&!document.getElementById("cascade-config-styles")){const e=document.createElement("style");e.id="cascade-config-styles",e.textContent=`
        .etl-node-config-form {
          padding: 2px 0 8px;
        }
        .etl-node-config-section {
          margin-bottom: 16px;
          padding: 14px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #fff;
        }
        .etl-node-config-overview {
          padding-bottom: 4px;
        }
        .etl-node-config-overview .etl-node-config-item {
          margin-bottom: 0;
        }
        .etl-node-config-overview .n-form-item-feedback-wrapper {
          min-height: 0;
        }
        .etl-node-config-section-heading {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
          color: #1f2937;
          font-size: 14px;
          font-weight: 600;
          line-height: 20px;
        }
        .etl-node-config-section-hint {
          color: #94a3b8;
          font-size: 12px;
          font-weight: 400;
        }
        .etl-node-config-overview-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .etl-node-config-overview-grid .etl-node-config-item {
          display: grid;
          grid-template-columns: 118px minmax(0, 1fr);
          column-gap: 12px;
          align-items: center;
        }
        .etl-node-config-overview-grid .n-form-item-label {
          align-self: center;
          margin-bottom: 0;
        }
        .etl-node-config-overview-grid .n-form-item-blank {
          grid-column: 2;
          grid-row: 1;
          min-width: 0;
        }
        .etl-node-config-overview-grid .n-form-item-feedback-wrapper {
          grid-column: 2;
          grid-row: 2;
          margin-top: 4px;
          min-height: 0;
        }
        .etl-node-config-item {
          margin-bottom: 14px;
        }
        .etl-node-config-item--alias,
        .etl-node-config-item--cascade {
          min-width: 0;
        }
        .etl-node-config-item--type .n-form-item-blank {
          min-height: 34px;
          align-items: center;
        }
        .etl-node-config-fields > .n-form-item:last-child {
          margin-bottom: 0;
        }
        .etl-node-config-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          padding-top: 4px;
        }
        @media (max-width: 640px) {
          .etl-node-config-overview-grid {
            grid-template-columns: 1fr;
          }
          .cascade-config-grid {
            grid-template-columns: 1fr;
          }
          .cascade-config-section-heading,
          .cascade-field-toolbar,
          .etl-node-config-section-heading {
            align-items: flex-start;
            flex-direction: column;
          }
        }
        .cascade-field-panel {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #fff;
          overflow: hidden;
        }
        .cascade-field-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 14px 10px;
          background: #f8fafc;
          border-bottom: 1px solid #eef2f7;
          flex-wrap: wrap;
        }
        .cascade-field-title {
          color: #1f2937;
          font-size: 14px;
          font-weight: 600;
          line-height: 20px;
        }
        .cascade-field-hint {
          margin-top: 2px;
          color: #64748b;
          font-size: 12px;
          line-height: 18px;
        }
        .cascade-field-summary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          color: #475569;
          font-size: 12px;
          background: #fff;
        }
        .cascade-config-layout {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
        }
        .cascade-config-section {
          padding: 14px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #fff;
        }
        .cascade-config-section-heading {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
          color: #1f2937;
          font-size: 14px;
          font-weight: 600;
        }
        .cascade-config-section-hint {
          color: #94a3b8;
          font-size: 12px;
          font-weight: 400;
        }
        .cascade-config-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px 14px;
        }
        .cascade-config-field {
          min-width: 0;
        }
        .cascade-config-field--full {
          grid-column: 1 / -1;
        }
        .cascade-config-label {
          display: block;
          margin-bottom: 6px;
          color: #475569;
          font-size: 13px;
          line-height: 18px;
        }
        .cascade-config-label-required {
          color: #ef4444;
        }
        .cascade-field-table {
          max-height: 300px;
          overflow: auto;
          scrollbar-width: thin;
        }
        .cascade-field-table::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .cascade-field-table::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: #cbd5e1;
        }
        .cascade-field-panel .n-data-table-tbody .n-data-table-tr {
          cursor: pointer;
        }
        .cascade-field-panel .n-data-table-tbody .n-data-table-tr:focus-visible {
          outline: 2px solid #60a5fa;
          outline-offset: -2px;
        }
        .cascade-field-primary-name {
          color: #1d4ed8;
          font-weight: 600;
        }
        .cascade-field-muted,
        .cascade-field-unselected {
          color: #94a3b8;
        }
        .cascade-field-panel .n-data-table {
          border-top: 1px solid #eef2f7;
        }
        .n-data-table-tr.selected-row td {
          background-color: #eff6ff !important;
        }
        .n-data-table-tr.selected-row:hover td {
          background-color: #dbeafe !important;
        }
        .n-data-table-tr.primary-row td {
          background-color: #fffbeb !important;
        }
        .n-data-table-tr.primary-row.selected-row td {
          background-color: #eff6ff !important;
        }
        .n-data-table-tr {
          cursor: pointer;
        }
      `,document.head.appendChild(e)}const se=()=>{t.value=u.value.map(e=>e.value)},ue=()=>{t.value=q.value},j=e=>{if(e._primary)return;t.value.indexOf(e.value)>=0?t.value=t.value.filter(n=>n!==e.value):t.value=[...t.value,e.value]};return E(u,async e=>{e.length>0&&t.value.length===0&&(await me(),t.value=e.map(a=>a.value)),O()}),()=>l("div",{class:"cascade-config-layout"},[l("section",{class:"cascade-config-section"},[l("div",{class:"cascade-config-section-heading"},[l("span",null,[v.mode==="sink"?"\u76EE\u6807\u6570\u636E\u6E90":"\u6570\u636E\u6E90",o(" "),l("span",{class:"cascade-config-label-required"},[o("*")])]),l("span",{class:"cascade-config-section-hint"},[o("\u6309\u987A\u5E8F\u9009\u62E9\u6570\u636E\u6E90\u3001\u5E93\u548C\u8868")])]),l("div",{class:"cascade-config-grid"},[l("div",{class:"cascade-config-field"},[l("label",{class:"cascade-config-label"},[o("\u6570\u636E\u6E90\u7C7B\u578B "),l("span",{class:"cascade-config-label-required"},[o("*")])]),l(z,{value:g.value,"onUpdate:value":e=>g.value=e,options:P.value,placeholder:"\u8BF7\u9009\u62E9\u6570\u636E\u5E93\u7C7B\u578B",filterable:!0,clearable:!0},null)]),l("div",{class:"cascade-config-field"},[l("label",{class:"cascade-config-label"},[o("\u6570\u636E\u6E90\u5B9E\u4F8B "),l("span",{class:"cascade-config-label-required"},[o("*")])]),I.value?l(T,{size:"small"},null):w.value.length===0&&g.value?l(k,{size:"small",description:'\u8BE5\u7C7B\u578B\u6682\u65E0\u6570\u636E\u6E90\u5B9E\u4F8B\uFF0C\u8BF7\u5148\u5230"\u6570\u636E\u6E90\u4E2D\u5FC3"\u521B\u5EFA'},null):l(z,{value:s.value,"onUpdate:value":e=>s.value=e,options:w.value,placeholder:"\u8BF7\u9009\u62E9\u6570\u636E\u6E90\u5B9E\u4F8B",filterable:!0,clearable:!0,disabled:!g.value},null)]),l("div",{class:"cascade-config-field"},[l("label",{class:"cascade-config-label"},[o("Schema / \u6570\u636E\u5E93 "),l("span",{class:"cascade-config-label-required"},[o("*")])]),_.value?l(T,{size:"small"},null):x.value.length===0&&s.value?l(ve,{vertical:!0},{default:()=>[l(k,{size:"small",description:"\u8BE5\u6570\u636E\u6E90\u65E0\u591A schema \u5217\u8868\uFF08MySQL \u7B49\u5355\u5E93\u6570\u636E\u5E93\u65E0\u9700\u9009\u62E9\uFF09"},null),l(U,{size:"small",onClick:()=>{d.value="default",b()}},{default:()=>[o("\u4F7F\u7528\u9ED8\u8BA4\uFF08default\uFF09")]})]}):l(z,{value:d.value,"onUpdate:value":e=>d.value=e,options:x.value,placeholder:"\u8BF7\u9009\u62E9\u6570\u636E\u5E93",filterable:!0,clearable:!0,disabled:!s.value},null)]),l("div",{class:"cascade-config-field"},[l("label",{class:"cascade-config-label"},[o("\u8868\u540D "),l("span",{class:"cascade-config-label-required"},[o("*")])]),R.value?l(T,{size:"small"},null):h.value.length===0&&d.value?l(k,{size:"small",description:"\u8BE5\u6570\u636E\u5E93\u4E0B\u65E0\u8868"},null):l(z,{value:m.value,"onUpdate:value":e=>m.value=e,options:h.value,placeholder:"\u8BF7\u9009\u62E9\u8868",filterable:!0,clearable:!0,disabled:!d.value},null)])])]),l("section",{class:"cascade-field-panel"},[l("div",{class:"cascade-field-toolbar"},[l("div",null,[l("div",{class:"cascade-field-title"},[o("\u5B57\u6BB5 "),l("span",{style:"color: #f56c6c;"},[o("*")])]),l("div",{class:"cascade-field-hint"},[o("\u70B9\u51FB\u5B57\u6BB5\u884C\u5373\u53EF\u9009\u62E9\u6216\u53D6\u6D88\uFF1B\u4E3B\u952E\u5B57\u6BB5\u4F1A\u81EA\u52A8\u4FDD\u7559")])]),l("div",{style:"display: flex; align-items: center; gap: 6px; flex-wrap: wrap;"},[l(U,{size:"tiny",onClick:se},{default:()=>[o("\u5168\u9009")]}),l(U,{size:"tiny",onClick:ue},{default:()=>[o("\u6E05\u7A7A\u53EF\u9009")]}),l(S,{size:"small",type:"info"},{default:()=>[o("\u5DF2\u9009 "),te.value,o(" / "),u.value.length]})])]),G.value>0&&l("div",{class:"cascade-field-summary"},[l(S,{size:"small",type:"warning",bordered:!1},{default:()=>[o("\u4E3B\u952E\u5FC5\u9009")]}),l("span",null,[o("\u68C0\u6D4B\u5230 "),G.value,o(" \u4E2A\u4E3B\u952E\u5B57\u6BB5\uFF0C\u5DF2\u81EA\u52A8\u52A0\u5165\u9009\u4E2D\u9879")])]),F.value?l(T,{size:"small"},null):u.value.length===0?l(k,{size:"small",description:"\u8BF7\u5148\u9009\u62E9\u8868"},null):l("div",{class:"cascade-field-table"},[l(ge,{size:"small",columns:oe.value,data:u.value,pagination:!1,"row-key":e=>e.value,"row-class-name":e=>[t.value.includes(e.value)?"selected-row":"",e._primary?"primary-row":""].filter(Boolean).join(" "),"row-props":e=>({role:"button",tabindex:e._primary?-1:0,"aria-label":e._primary?`${e._name}\uFF08\u4E3B\u952E\uFF0C\u5FC5\u9009\uFF09`:`${e._name}\uFF08${t.value.includes(e.value)?"\u5DF2\u9009\uFF0C\u70B9\u51FB\u53D6\u6D88":"\u672A\u9009\uFF0C\u70B9\u51FB\u9009\u62E9"}\uFF09`,"aria-pressed":t.value.includes(e.value),onClick:()=>j(e),onKeydown:a=>{(a.key==="Enter"||a.key===" ")&&!e._primary&&(a.preventDefault(),j(e))}})},null)])])])}});export{da as default};
