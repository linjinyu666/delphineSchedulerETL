import{l as S,k as b,n as A,p as y,d as P,b as G,e as E,Q as K,X,g as N,t as Q,h as T,V as J,ct as Y,r as j,o as D,be as $,S as Z,bH as W,x as ee,E as te,G as re,u as U,H as oe,c as r,i as ae}from"./index.e2a499a0.js";import{c as ie,u as se,a as ne,i as le}from"./use-table.5d2063b6.js";import{u as ce}from"./file.2efdb359.js";import{C as _}from"./index.ab91735a.js";import me from"./index.36e9bc5c.js";import pe from"./index.c92270ae.js";import ue from"./index.56e935de.js";import{s as de}from"./index.module.ea5e4633.js";import{S as he}from"./index.1ad8300e.js";import{N as fe}from"./ButtonGroup.75a9a21d.js";import{S as ge}from"./SearchOutlined.f07048a4.js";import{i as be}from"./is-browser.45c3bd93.js";import{b as ve}from"./resolve-slot.8e13efbe.js";import{N as L}from"./Space.33d2005a.js";import{N as x}from"./Button.5289311a.js";import{N as Re}from"./Icon.a3fc0ddd.js";import{N as Ce,a as Se}from"./DataTable.775b1ef3.js";import"./index.6c7b0692.js";import"./index.162b792d.js";import"./service.a1d4770e.js";import"./ui-setting.cbbf8244.js";import"./lodash.aa74671d.js";import"./common.df241c14.js";import"./SettingOutlined.616b993e.js";import"./PauseCircleOutlined.2f350c07.js";import"./CloseCircleOutlined.8fb4cbc9.js";import"./CheckCircleOutlined.a506c799.js";import"./SwapOutlined.4b21e709.js";import"./EditOutlined.a9a65741.js";import"./index.c373f64b.js";import"./table-action.5c3e55e1.js";import"./FormOutlined.a087879a.js";import"./UploadOutlined.3f1513a2.js";import"./DownloadOutlined.179a6cd6.js";import"./DeleteOutlined.57b278e1.js";import"./Tooltip.7d3e32b7.js";import"./Popover.25d00aa8.js";import"./index.d814ba67.js";import"./flatten.dd0953ad.js";import"./Scrollbar.632c53f6.js";import"./VResizeObserver.7a362d95.js";import"./use-false-until-truthy.830dc8b2.js";import"./_baseMap.ab7431c2.js";import"./get.3de24c8f.js";import"./cssr.4cb0a96a.js";import"./utils.c8c85f1b.js";import"./format-length.d7d829b3.js";import"./use-merged-state.5f5f01e5.js";import"./use-compitable.0fac5bfa.js";import"./next-frame-once.e5ee25e8.js";import"./Popconfirm.157d9dd5.js";import"./use-locale.c60aec6e.js";import"./keysOf.ab13e590.js";import"./browser.7502e29f.js";import"./use-form-item.f54209ce.js";import"./get-slot.80096ab3.js";import"./index.62f1e1b0.js";import"./index.649ab250.js";import"./column-width-config.e940e41a.js";import"./Ellipsis.50be4cc6.js";import"./Card.52527c99.js";import"./index.777983c2.js";import"./Modal.089671d5.js";import"./use-is-composing.b18d156a.js";import"./fade-in-scale-up.cssr.d770f4c4.js";import"./index.3ef69258.js";import"./Form.59d34f11.js";import"./FormItem.47a00bba.js";import"./Input.30f0b03e.js";import"./Suffix.4bfa7c94.js";import"./Add.278ad20e.js";import"./Image.379c2793.js";import"./ArrowDown.879122e5.js";import"./Checkbox.487a47ec.js";import"./RadioGroup.5b42f21b.js";import"./Radio.34d7c035.js";import"./Dropdown.9dd2d14f.js";import"./ChevronRight.cf81aac9.js";import"./Select.467e6aa9.js";import"./Empty.1811a9c7.js";import"./use-keyboard.2fb9826f.js";import"./Forward.36751c31.js";const ye=S("breadcrumb",`
 white-space: nowrap;
 cursor: default;
 line-height: var(--n-item-line-height);
`,[b("ul",`
 list-style: none;
 padding: 0;
 margin: 0;
 `),b("a",`
 color: inherit;
 text-decoration: inherit;
 `),S("breadcrumb-item",`
 font-size: var(--n-font-size);
 transition: color .3s var(--n-bezier);
 display: inline-flex;
 align-items: center;
 `,[S("icon",`
 font-size: 18px;
 vertical-align: -.2em;
 transition: color .3s var(--n-bezier);
 color: var(--n-item-text-color);
 `),b("&:not(:last-child)",[A("clickable",[y("link",`
 cursor: pointer;
 `,[b("&:hover",`
 background-color: var(--n-item-color-hover);
 `),b("&:active",`
 background-color: var(--n-item-color-pressed); 
 `)])])]),y("link",`
 padding: 4px;
 border-radius: var(--n-item-border-radius);
 transition:
 background-color .3s var(--n-bezier),
 color .3s var(--n-bezier);
 color: var(--n-item-text-color);
 position: relative;
 `,[b("&:hover",`
 color: var(--n-item-text-color-hover);
 `,[S("icon",`
 color: var(--n-item-text-color-hover);
 `)]),b("&:active",`
 color: var(--n-item-text-color-pressed);
 `,[S("icon",`
 color: var(--n-item-text-color-pressed);
 `)])]),y("separator",`
 margin: 0 8px;
 color: var(--n-separator-color);
 transition: color .3s var(--n-bezier);
 user-select: none;
 -webkit-user-select: none;
 `),b("&:last-child",[y("link",`
 font-weight: var(--n-font-weight-active);
 cursor: unset;
 color: var(--n-item-text-color-active);
 `,[S("icon",`
 color: var(--n-item-text-color-active);
 `)]),y("separator",`
 display: none;
 `)])])]),F=J("n-breadcrumb"),Le=Object.assign(Object.assign({},E.props),{separator:{type:String,default:"/"}}),xe=P({name:"Breadcrumb",props:Le,setup(e){const{mergedClsPrefixRef:a,inlineThemeDisabled:i}=G(e),u=E("Breadcrumb","-breadcrumb",ye,Y,e,a);K(F,{separatorRef:X(e,"separator"),mergedClsPrefixRef:a});const t=N(()=>{const{common:{cubicBezierEaseInOut:m},self:{separatorColor:p,itemTextColor:l,itemTextColorHover:c,itemTextColorPressed:h,itemTextColorActive:v,fontSize:g,fontWeightActive:R,itemBorderRadius:C,itemColorHover:o,itemColorPressed:d,itemLineHeight:s}}=u.value;return{"--n-font-size":g,"--n-bezier":m,"--n-item-text-color":l,"--n-item-text-color-hover":c,"--n-item-text-color-pressed":h,"--n-item-text-color-active":v,"--n-separator-color":p,"--n-item-color-hover":o,"--n-item-color-pressed":d,"--n-item-border-radius":C,"--n-font-weight-active":R,"--n-item-line-height":s}}),n=i?Q("breadcrumb",void 0,t,e):void 0;return{mergedClsPrefix:a,cssVars:i?void 0:t,themeClass:n==null?void 0:n.themeClass,onRender:n==null?void 0:n.onRender}},render(){var e;return(e=this.onRender)===null||e===void 0||e.call(this),T("nav",{class:[`${this.mergedClsPrefix}-breadcrumb`,this.themeClass],style:this.cssVars,"aria-label":"Breadcrumb"},T("ul",null,this.$slots))}}),Te=be?window:null,ze=(e=Te)=>{const a=()=>{const{hash:t,host:n,hostname:m,href:p,origin:l,pathname:c,port:h,protocol:v,search:g}=(e==null?void 0:e.location)||{};return{hash:t,host:n,hostname:m,href:p,origin:l,pathname:c,port:h,protocol:v,search:g}},i=()=>{u.value=a()},u=j(a());return D(()=>{e&&(e.addEventListener("popstate",i),e.addEventListener("hashchange",i))}),$(()=>{e&&(e.removeEventListener("popstate",i),e.removeEventListener("hashchange",i))}),u},we={separator:String,href:String,clickable:{type:Boolean,default:!0},onClick:Function},ke=P({name:"BreadcrumbItem",props:we,setup(e,{slots:a}){const i=Z(F,null);if(!i)return()=>null;const{separatorRef:u,mergedClsPrefixRef:t}=i,n=ze(),m=N(()=>e.href?"a":"span"),p=N(()=>n.value.href===e.href?"location":null);return()=>{const{value:l}=t;return T("li",{class:[`${l}-breadcrumb-item`,e.clickable&&`${l}-breadcrumb-item--clickable`]},T(m.value,{class:`${l}-breadcrumb-item__link`,"aria-current":p.value,href:e.href,onClick:e.onClick},a),T("span",{class:`${l}-breadcrumb-item__separator`,"aria-hidden":"true"},ve(a.separator,()=>{var c;return[(c=e.separator)!==null&&c!==void 0?c:u.value]})))}}});function w(e){return typeof e=="function"||Object.prototype.toString.call(e)==="[object Object]"&&!ae(e)}const Ne={resourceType:{type:String,default:void 0}},ar=P({name:"ResourceList",props:Ne,setup(e){var B;const a=W(),i=ce(),u=j(),{variables:t,tableWidth:n,requestData:m,updateList:p,createColumns:l,handleCreateFile:c}=ie(),h=ee();t.resourceType=e.resourceType;const v=f=>{t.pagination.page=f,m()},g=f=>{t.pagination.page=1,t.pagination.pageSize=f,m()},R=()=>{m()},C=()=>{t.folderShowRef=!0},o=()=>{t.isReupload=!1,t.uploadShowRef=!0},d=()=>{t.renameShowRef=!0},s=se(),z=ne(),V=()=>{z.getIsDetailPage?(t.resourceType=s.getResourceType,t.fullName=s.getFullName,t.tenantCode=s.getTenantCode,t.searchRef=s.getSearchValue,t.pagination.page=s.getPage,t.pagination.pageSize=s.getPageSize,le(t.searchRef)||R(),s.$reset(),z.$reset()):(s.$reset(),z.$reset())};$(()=>{z.$reset()}),D(()=>{V(),l(t),i.setCurrentDir(t.fullName),u.value=i.getCurrentDir.replace(/\/+$/g,"").split("/").slice(2),m()});const H=(B=te())==null?void 0:B.appContext.config.globalProperties.trim,M=f=>{const k=t.fullName.split("/").slice(0,f+3).join("/")+"/";O(k)},O=f=>{const{tenantCode:k}=t,q=h.getBaseResDir,I=e.resourceType==="ETL";f===""||!f.startsWith(q)?a.push({name:I?"etl-manage":"file-manage"}):a.push({name:I?"etl-subdirectory":"resource-file-subdirectory",query:{prefix:f,tenantCode:k}})};return re(U().locale,()=>{l(t)}),{breadListRef:u,tableWidth:n,updateList:p,handleConditions:R,handleCreateFolder:C,handleCreateFile:c,handleUploadFile:o,handleRenameFile:d,handleUpdatePage:v,handleUpdatePageSize:g,handleBread:M,trim:H,...oe(t)}},render(){var g,R,C;let e;const{t:a}=U(),{handleConditions:i,handleCreateFolder:u,handleCreateFile:t,handleUploadFile:n,tableWidth:m}=this,p=this.resourceType==="ETL",l=p?"ETL \u4F5C\u4E1A\u7BA1\u7406":a("resource.file.file_manage"),c=p?"\u65B0\u5EFA ETL \u4F5C\u4E1A":a("resource.file.create_file"),h=p?"\u4E0A\u4F20 ETL \u6587\u4EF6":a("resource.file.upload_files"),v=p?(g=this.breadListRef)!=null&&g.length?[{item:this.breadListRef[this.breadListRef.length-1],index:this.breadListRef.length-1}]:[]:(C=(R=this.breadListRef)==null?void 0:R.map((o,d)=>({item:o,index:d})))!=null?C:[];return r(L,{vertical:!0},{default:()=>[r(_,null,{default:()=>[r(L,{justify:"space-between"},{default:()=>[r(fe,{size:"small"},{default:()=>[r(x,{type:"primary",onClick:u,class:"btn-create-directory"},w(e=a("resource.file.create_folder"))?e:{default:()=>[e]}),r(x,{onClick:t,class:"btn-create-file"},w(c)?c:{default:()=>[c]}),r(x,{onClick:n,class:"btn-upload-resource"},w(h)?h:{default:()=>[h]})]}),r(L,null,{default:()=>[r(he,{placeholder:a("resource.file.enter_keyword_tips"),value:this.searchRef,"onUpdate:value":o=>this.searchRef=o,onSearch:i},null),r(x,{size:"small",type:"primary",onClick:i},{default:()=>[r(Re,null,{default:()=>[r(ge,null,null)]})]})]})]})]}),r(_,{title:l},{header:()=>{let o;return r(xe,{separator:">"},w(o=v.map(({item:d,index:s})=>r(ke,null,{default:()=>[r(x,{text:!0,disabled:s>0&&s===this.breadListRef.length-1,onClick:()=>this.handleBread(s)},{default:()=>[s===0?l:d]})]})))?o:{default:()=>[o]})},default:()=>r(L,{vertical:!0},{default:()=>{var o;return[r(Ce,{remote:!0,columns:this.columns,data:(o=this.resourceList)==null?void 0:o.table,striped:!0,size:"small",class:de["table-box"],"row-class-name":"items",scrollX:m},null),r(L,{justify:"center"},{default:()=>[r(Se,{page:this.pagination.page,"onUpdate:page":d=>this.pagination.page=d,pageSize:this.pagination.pageSize,"onUpdate:pageSize":d=>this.pagination.pageSize=d,pageSizes:this.pagination.pageSizes,"item-count":this.pagination.itemCount,onUpdatePage:this.handleUpdatePage,onUpdatePageSize:this.handleUpdatePageSize,"show-quick-jumper":!0,"show-size-picker":!0},null)]})]}})}),r(me,{show:this.folderShowRef,"onUpdate:show":o=>this.folderShowRef=o,resourceType:this.resourceType,onUpdateList:this.updateList},null),r(pe,{show:this.uploadShowRef,"onUpdate:show":o=>this.uploadShowRef=o,isReupload:this.isReupload,resourceType:this.resourceType,name:this.reuploadInfo.name,fullName:this.reuploadInfo.fullName,description:this.reuploadInfo.description,userName:this.reuploadInfo.user_name,onUpdateList:this.updateList},null),r(ue,{show:this.renameShowRef,"onUpdate:show":o=>this.renameShowRef=o,resourceType:this.resourceType,name:this.renameInfo.name,fullName:this.renameInfo.fullName,description:this.renameInfo.description,userName:this.renameInfo.user_name,onUpdateList:this.updateList},null)]})}});export{ar as default};
