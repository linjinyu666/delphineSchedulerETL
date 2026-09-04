import{l as v,k as b,n as A,p as C,d as P,b as G,e as E,Q as K,X,g as N,t as Q,h as y,V as J,ct as Y,r as j,o as D,be as $,S as Z,bH as W,x as ee,E as te,G as re,u as I,H as oe,c as r,i as ae}from"./index.291055ec.js";import{c as ie,u as se,a as ne,i as le}from"./use-table.2319fd47.js";import{u as ce}from"./file.484677f4.js";import{C as _}from"./index.09819bb0.js";import pe from"./index.2e6ca0f3.js";import me from"./index.01bf6d15.js";import ue from"./index.af6caf1e.js";import{s as de}from"./index.module.ea5e4633.js";import{S as he}from"./index.139536bd.js";import{N as fe}from"./ButtonGroup.bfdf58b9.js";import{S as ge}from"./SearchOutlined.06d4106c.js";import{i as be}from"./is-browser.45c3bd93.js";import{b as ve}from"./resolve-slot.9ff69768.js";import{N as S}from"./Space.8f6fa813.js";import{N as R}from"./Button.2b930b23.js";import{N as Ce}from"./Icon.4afb1f14.js";import{N as Se,a as Re}from"./DataTable.2727197d.js";import"./index.2c047ef1.js";import"./index.75d843c0.js";import"./service.fe41789d.js";import"./ui-setting.e699d88c.js";import"./lodash.bc6e8fb1.js";import"./common.0b2528f9.js";import"./SettingOutlined.32c6d33f.js";import"./PauseCircleOutlined.341ab9f9.js";import"./CloseCircleOutlined.f75779c3.js";import"./CheckCircleOutlined.10bc3a7c.js";import"./EditOutlined.7443913d.js";import"./index.f343eb2c.js";import"./table-action.4c8ffa40.js";import"./FormOutlined.e44de0ad.js";import"./UploadOutlined.f59645d9.js";import"./DownloadOutlined.1784d5cd.js";import"./DeleteOutlined.6e28fd93.js";import"./Tooltip.86d5680c.js";import"./Popover.883534d5.js";import"./index.64209708.js";import"./Scrollbar.c679a5ee.js";import"./VResizeObserver.4329b960.js";import"./use-false-until-truthy.c0107dd9.js";import"./_baseMap.c2bb8872.js";import"./get.064e9aa7.js";import"./cssr.58e656e6.js";import"./utils.4d219de7.js";import"./format-length.d7d829b3.js";import"./use-merged-state.b2e27208.js";import"./use-compitable.5328878b.js";import"./get-first-slot-vnode.dd05f918.js";import"./flatten.0c1da1e2.js";import"./next-frame-once.e5ee25e8.js";import"./call.00499c7e.js";import"./Popconfirm.d280dc22.js";import"./use-locale.70afb681.js";import"./keysOf.ab13e590.js";import"./use-form-item.5072a1b6.js";import"./get-slot.80096ab3.js";import"./index.62f1e1b0.js";import"./index.1b219efe.js";import"./column-width-config.b28b7317.js";import"./Ellipsis.dddc9bf1.js";import"./Card.a8ecd4c1.js";import"./index.40baa165.js";import"./Modal.eb559db8.js";import"./use-is-composing.29ff64de.js";import"./fade-in-scale-up.cssr.05c434d7.js";import"./index.3ef69258.js";import"./Form.e615156d.js";import"./FormItem.74fde172.js";import"./Input.ac9e3ea3.js";import"./Suffix.08a7effb.js";import"./Add.7f7bc90d.js";import"./Image.6608f967.js";import"./ArrowDown.daf0c801.js";import"./Checkbox.ac5a56a4.js";import"./RadioGroup.622b1e47.js";import"./Radio.212219a6.js";import"./Dropdown.088eb8c3.js";import"./ChevronRight.e5d8aea1.js";import"./Select.de6a6a4e.js";import"./Empty.96334a86.js";import"./use-keyboard.5fb40dd4.js";import"./Forward.1eb1561c.js";const ye=v("breadcrumb",`
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
 `),v("breadcrumb-item",`
 font-size: var(--n-font-size);
 transition: color .3s var(--n-bezier);
 display: inline-flex;
 align-items: center;
 `,[v("icon",`
 font-size: 18px;
 vertical-align: -.2em;
 transition: color .3s var(--n-bezier);
 color: var(--n-item-text-color);
 `),b("&:not(:last-child)",[A("clickable",[C("link",`
 cursor: pointer;
 `,[b("&:hover",`
 background-color: var(--n-item-color-hover);
 `),b("&:active",`
 background-color: var(--n-item-color-pressed); 
 `)])])]),C("link",`
 padding: 4px;
 border-radius: var(--n-item-border-radius);
 transition:
 background-color .3s var(--n-bezier),
 color .3s var(--n-bezier);
 color: var(--n-item-text-color);
 position: relative;
 `,[b("&:hover",`
 color: var(--n-item-text-color-hover);
 `,[v("icon",`
 color: var(--n-item-text-color-hover);
 `)]),b("&:active",`
 color: var(--n-item-text-color-pressed);
 `,[v("icon",`
 color: var(--n-item-text-color-pressed);
 `)])]),C("separator",`
 margin: 0 8px;
 color: var(--n-separator-color);
 transition: color .3s var(--n-bezier);
 user-select: none;
 -webkit-user-select: none;
 `),b("&:last-child",[C("link",`
 font-weight: var(--n-font-weight-active);
 cursor: unset;
 color: var(--n-item-text-color-active);
 `,[v("icon",`
 color: var(--n-item-text-color-active);
 `)]),C("separator",`
 display: none;
 `)])])]),F=J("n-breadcrumb"),Le=Object.assign(Object.assign({},E.props),{separator:{type:String,default:"/"}}),Te=P({name:"Breadcrumb",props:Le,setup(e){const{mergedClsPrefixRef:a,inlineThemeDisabled:i}=G(e),p=E("Breadcrumb","-breadcrumb",ye,Y,e,a);K(F,{separatorRef:X(e,"separator"),mergedClsPrefixRef:a});const t=N(()=>{const{common:{cubicBezierEaseInOut:c},self:{separatorColor:m,itemTextColor:n,itemTextColorHover:l,itemTextColorPressed:h,itemTextColorActive:o,fontSize:u,fontWeightActive:f,itemBorderRadius:T,itemColorHover:x,itemColorPressed:z,itemLineHeight:d}}=p.value;return{"--n-font-size":u,"--n-bezier":c,"--n-item-text-color":n,"--n-item-text-color-hover":l,"--n-item-text-color-pressed":h,"--n-item-text-color-active":o,"--n-separator-color":m,"--n-item-color-hover":x,"--n-item-color-pressed":z,"--n-item-border-radius":T,"--n-font-weight-active":f,"--n-item-line-height":d}}),s=i?Q("breadcrumb",void 0,t,e):void 0;return{mergedClsPrefix:a,cssVars:i?void 0:t,themeClass:s==null?void 0:s.themeClass,onRender:s==null?void 0:s.onRender}},render(){var e;return(e=this.onRender)===null||e===void 0||e.call(this),y("nav",{class:[`${this.mergedClsPrefix}-breadcrumb`,this.themeClass],style:this.cssVars,"aria-label":"Breadcrumb"},y("ul",null,this.$slots))}}),xe=be?window:null,ze=(e=xe)=>{const a=()=>{const{hash:t,host:s,hostname:c,href:m,origin:n,pathname:l,port:h,protocol:o,search:u}=(e==null?void 0:e.location)||{};return{hash:t,host:s,hostname:c,href:m,origin:n,pathname:l,port:h,protocol:o,search:u}},i=()=>{p.value=a()},p=j(a());return D(()=>{e&&(e.addEventListener("popstate",i),e.addEventListener("hashchange",i))}),$(()=>{e&&(e.removeEventListener("popstate",i),e.removeEventListener("hashchange",i))}),p},we={separator:String,href:String,clickable:{type:Boolean,default:!0},onClick:Function},ke=P({name:"BreadcrumbItem",props:we,setup(e,{slots:a}){const i=Z(F,null);if(!i)return()=>null;const{separatorRef:p,mergedClsPrefixRef:t}=i,s=ze(),c=N(()=>e.href?"a":"span"),m=N(()=>s.value.href===e.href?"location":null);return()=>{const{value:n}=t;return y("li",{class:[`${n}-breadcrumb-item`,e.clickable&&`${n}-breadcrumb-item--clickable`]},y(c.value,{class:`${n}-breadcrumb-item__link`,"aria-current":m.value,href:e.href,onClick:e.onClick},a),y("span",{class:`${n}-breadcrumb-item__separator`,"aria-hidden":"true"},ve(a.separator,()=>{var l;return[(l=e.separator)!==null&&l!==void 0?l:p.value]})))}}});function k(e){return typeof e=="function"||Object.prototype.toString.call(e)==="[object Object]"&&!ae(e)}const Ne={resourceType:{type:String,default:void 0}},ar=P({name:"ResourceList",props:Ne,setup(e){var B;const a=W(),i=ce(),p=j(),{variables:t,tableWidth:s,requestData:c,updateList:m,createColumns:n,handleCreateFile:l}=ie(),h=ee();t.resourceType=e.resourceType;const o=g=>{t.pagination.page=g,c()},u=g=>{t.pagination.page=1,t.pagination.pageSize=g,c()},f=()=>{c()},T=()=>{t.folderShowRef=!0},x=()=>{t.isReupload=!1,t.uploadShowRef=!0},z=()=>{t.renameShowRef=!0},d=se(),L=ne(),V=()=>{L.getIsDetailPage?(t.resourceType=d.getResourceType,t.fullName=d.getFullName,t.tenantCode=d.getTenantCode,t.searchRef=d.getSearchValue,t.pagination.page=d.getPage,t.pagination.pageSize=d.getPageSize,le(t.searchRef)||f(),d.$reset(),L.$reset()):(d.$reset(),L.$reset())};$(()=>{L.$reset()}),D(()=>{V(),n(t),i.setCurrentDir(t.fullName),p.value=i.getCurrentDir.replace(/\/+$/g,"").split("/").slice(2),c()});const H=(B=te())==null?void 0:B.appContext.config.globalProperties.trim,M=g=>{const w=t.fullName.split("/").slice(0,g+3).join("/")+"/";O(w)},O=g=>{const{tenantCode:w}=t,q=h.getBaseResDir,U=e.resourceType==="ETL";g===""||!g.startsWith(q)?a.push({name:U?"etl-manage":"file-manage"}):a.push({name:U?"etl-subdirectory":"resource-file-subdirectory",query:{prefix:g,tenantCode:w}})};return re(I().locale,()=>{n(t)}),{breadListRef:p,tableWidth:s,updateList:m,handleConditions:f,handleCreateFolder:T,handleCreateFile:l,handleUploadFile:x,handleRenameFile:z,handleUpdatePage:o,handleUpdatePageSize:u,handleBread:M,trim:H,...oe(t)}},render(){let e;const{t:a}=I(),{handleConditions:i,handleCreateFolder:p,handleCreateFile:t,handleUploadFile:s,tableWidth:c}=this,m=this.resourceType==="ETL",n=m?"ETL \u4F5C\u4E1A\u7BA1\u7406":a("resource.file.file_manage"),l=m?"\u65B0\u5EFA ETL \u4F5C\u4E1A":a("resource.file.create_file"),h=m?"\u4E0A\u4F20 ETL \u6587\u4EF6":a("resource.file.upload_files");return r(S,{vertical:!0},{default:()=>[r(_,null,{default:()=>[r(S,{justify:"space-between"},{default:()=>[r(fe,{size:"small"},{default:()=>[r(R,{type:"primary",onClick:p,class:"btn-create-directory"},k(e=a("resource.file.create_folder"))?e:{default:()=>[e]}),r(R,{onClick:t,class:"btn-create-file"},k(l)?l:{default:()=>[l]}),r(R,{onClick:s,class:"btn-upload-resource"},k(h)?h:{default:()=>[h]})]}),r(S,null,{default:()=>[r(he,{placeholder:a("resource.file.enter_keyword_tips"),value:this.searchRef,"onUpdate:value":o=>this.searchRef=o,onSearch:i},null),r(R,{size:"small",type:"primary",onClick:i},{default:()=>[r(Ce,null,{default:()=>[r(ge,null,null)]})]})]})]})]}),r(_,{title:n},{header:()=>r(Te,{separator:">"},{default:()=>{var o;return[(o=this.breadListRef)==null?void 0:o.map((u,f)=>r(ke,null,{default:()=>[r(R,{text:!0,disabled:f>0&&f===this.breadListRef.length-1,onClick:()=>this.handleBread(f)},{default:()=>[f===0?n:u]})]}))]}}),default:()=>r(S,{vertical:!0},{default:()=>{var o;return[r(Se,{remote:!0,columns:this.columns,data:(o=this.resourceList)==null?void 0:o.table,striped:!0,size:"small",class:de["table-box"],"row-class-name":"items",scrollX:c},null),r(S,{justify:"center"},{default:()=>[r(Re,{page:this.pagination.page,"onUpdate:page":u=>this.pagination.page=u,pageSize:this.pagination.pageSize,"onUpdate:pageSize":u=>this.pagination.pageSize=u,pageSizes:this.pagination.pageSizes,"item-count":this.pagination.itemCount,onUpdatePage:this.handleUpdatePage,onUpdatePageSize:this.handleUpdatePageSize,"show-quick-jumper":!0,"show-size-picker":!0},null)]})]}})}),r(pe,{show:this.folderShowRef,"onUpdate:show":o=>this.folderShowRef=o,resourceType:this.resourceType,onUpdateList:this.updateList},null),r(me,{show:this.uploadShowRef,"onUpdate:show":o=>this.uploadShowRef=o,isReupload:this.isReupload,resourceType:this.resourceType,name:this.reuploadInfo.name,fullName:this.reuploadInfo.fullName,description:this.reuploadInfo.description,userName:this.reuploadInfo.user_name,onUpdateList:this.updateList},null),r(ue,{show:this.renameShowRef,"onUpdate:show":o=>this.renameShowRef=o,resourceType:this.resourceType,name:this.renameInfo.name,fullName:this.renameInfo.fullName,description:this.renameInfo.description,userName:this.renameInfo.user_name,onUpdateList:this.updateList},null)]})}});export{ar as default};
