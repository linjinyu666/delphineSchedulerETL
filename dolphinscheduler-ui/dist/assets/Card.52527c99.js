import{k as t,l as b,m as U,n as d,p as n,q as X,s as Y,d as Z,b as ee,e as u,f as oe,g as h,t as re,h as l,N as te,v as ne,j as p}from"./index.e2a499a0.js";import{r as c,c as de}from"./resolve-slot.8e13efbe.js";import{k as ae}from"./keysOf.ab13e590.js";import{a as se}from"./index.62f1e1b0.js";const le=t([b("card",`
 font-size: var(--n-font-size);
 line-height: var(--n-line-height);
 display: flex;
 flex-direction: column;
 width: 100%;
 box-sizing: border-box;
 position: relative;
 border-radius: var(--n-border-radius);
 background-color: var(--n-color);
 color: var(--n-text-color);
 word-break: break-word;
 transition: 
 color .3s var(--n-bezier),
 background-color .3s var(--n-bezier),
 box-shadow .3s var(--n-bezier),
 border-color .3s var(--n-bezier);
 `,[U({background:"var(--n-color-modal)"}),d("hoverable",[t("&:hover","box-shadow: var(--n-box-shadow);")]),d("content-segmented",[t(">",[n("content",{paddingTop:"var(--n-padding-bottom)"})])]),d("content-soft-segmented",[t(">",[n("content",`
 margin: 0 var(--n-padding-left);
 padding: var(--n-padding-bottom) 0;
 `)])]),d("footer-segmented",[t(">",[n("footer",{paddingTop:"var(--n-padding-bottom)"})])]),d("footer-soft-segmented",[t(">",[n("footer",`
 padding: var(--n-padding-bottom) 0;
 margin: 0 var(--n-padding-left);
 `)])]),t(">",[b("card-header",`
 box-sizing: border-box;
 display: flex;
 align-items: center;
 font-size: var(--n-title-font-size);
 padding:
 var(--n-padding-top)
 var(--n-padding-left)
 var(--n-padding-bottom)
 var(--n-padding-left);
 `,[n("main",`
 font-weight: var(--n-title-font-weight);
 transition: color .3s var(--n-bezier);
 flex: 1;
 color: var(--n-title-text-color);
 `),n("extra",`
 display: flex;
 align-items: center;
 font-size: var(--n-font-size);
 font-weight: 400;
 transition: color .3s var(--n-bezier);
 color: var(--n-text-color);
 `),n("close",`
 margin: 0 0 0 8px;
 transition:
 background-color .3s var(--n-bezier),
 color .3s var(--n-bezier);
 `)]),n("action",`
 box-sizing: border-box;
 transition:
 background-color .3s var(--n-bezier),
 border-color .3s var(--n-bezier);
 background-clip: padding-box;
 background-color: var(--n-action-color);
 `),n("content","flex: 1;"),n("content, footer",`
 box-sizing: border-box;
 padding: 0 var(--n-padding-left) var(--n-padding-bottom) var(--n-padding-left);
 font-size: var(--n-font-size);
 `,[t("&:first-child",{paddingTop:"var(--n-padding-bottom)"})]),n("action",`
 background-color: var(--n-action-color);
 padding: var(--n-padding-bottom) var(--n-padding-left);
 border-bottom-left-radius: var(--n-border-radius);
 border-bottom-right-radius: var(--n-border-radius);
 `)]),b("card-cover",`
 overflow: hidden;
 width: 100%;
 border-radius: var(--n-border-radius) var(--n-border-radius) 0 0;
 `,[t("img",`
 display: block;
 width: 100%;
 `)]),d("bordered",`
 border: 1px solid var(--n-border-color);
 `,[t("&:target","border-color: var(--n-color-target);")]),d("action-segmented",[t(">",[n("action",[t("&:not(:first-child)",{borderTop:"1px solid var(--n-border-color)"})])])]),d("content-segmented, content-soft-segmented",[t(">",[n("content",{transition:"border-color 0.3s var(--n-bezier)"},[t("&:not(:first-child)",{borderTop:"1px solid var(--n-border-color)"})])])]),d("footer-segmented, footer-soft-segmented",[t(">",[n("footer",{transition:"border-color 0.3s var(--n-bezier)"},[t("&:not(:first-child)",{borderTop:"1px solid var(--n-border-color)"})])])]),d("embedded",`
 background-color: var(--n-color-embedded);
 `)]),X(b("card",`
 background: var(--n-color-modal);
 `,[d("embedded",`
 background-color: var(--n-color-embedded-modal);
 `)])),Y(b("card",`
 background: var(--n-color-popover);
 `,[d("embedded",`
 background-color: var(--n-color-embedded-popover);
 `)]))]),x={title:String,contentStyle:[Object,String],headerStyle:[Object,String],headerExtraStyle:[Object,String],footerStyle:[Object,String],embedded:Boolean,segmented:{type:[Boolean,Object],default:!1},size:{type:String,default:"medium"},bordered:{type:Boolean,default:!0},closable:{type:Boolean,default:!1},hoverable:Boolean,role:String,onClose:[Function,Array]},fe=ae(x),ie=Object.assign(Object.assign({},u.props),x),me=Z({name:"Card",props:ie,setup(r){const v=()=>{const{onClose:s}=r;s&&de(s)},{inlineThemeDisabled:g,mergedClsPrefixRef:e,mergedRtlRef:f}=ee(r),i=u("Card","-card",le,ne,r,e),m=oe("Card",f,e),a=h(()=>{const{size:s}=r,{self:{color:z,colorModal:C,colorTarget:y,textColor:S,titleTextColor:k,titleFontWeight:$,borderColor:w,actionColor:T,borderRadius:B,lineHeight:P,closeIconColor:R,closeIconColorHover:_,closeIconColorPressed:E,closeColorHover:O,closeColorPressed:j,closeBorderRadius:M,closeIconSize:I,closeSize:F,boxShadow:H,colorPopover:N,colorEmbedded:V,colorEmbeddedModal:K,colorEmbeddedPopover:L,[p("padding",s)]:W,[p("fontSize",s)]:q,[p("titleFontSize",s)]:A},common:{cubicBezierEaseInOut:D}}=i.value,{top:G,left:J,bottom:Q}=se(W);return{"--n-bezier":D,"--n-border-radius":B,"--n-color":z,"--n-color-modal":C,"--n-color-popover":N,"--n-color-embedded":V,"--n-color-embedded-modal":K,"--n-color-embedded-popover":L,"--n-color-target":y,"--n-text-color":S,"--n-line-height":P,"--n-action-color":T,"--n-title-text-color":k,"--n-title-font-weight":$,"--n-close-icon-color":R,"--n-close-icon-color-hover":_,"--n-close-icon-color-pressed":E,"--n-close-color-hover":O,"--n-close-color-pressed":j,"--n-border-color":w,"--n-box-shadow":H,"--n-padding-top":G,"--n-padding-bottom":Q,"--n-padding-left":J,"--n-font-size":q,"--n-title-font-size":A,"--n-close-size":F,"--n-close-icon-size":I,"--n-close-border-radius":M}}),o=g?re("card",h(()=>r.size[0]),a,r):void 0;return{rtlEnabled:m,mergedClsPrefix:e,mergedTheme:i,handleCloseClick:v,cssVars:g?void 0:a,themeClass:o==null?void 0:o.themeClass,onRender:o==null?void 0:o.onRender}},render(){const{segmented:r,bordered:v,hoverable:g,mergedClsPrefix:e,rtlEnabled:f,onRender:i,embedded:m,$slots:a}=this;return i==null||i(),l("div",{class:[`${e}-card`,this.themeClass,m&&`${e}-card--embedded`,{[`${e}-card--rtl`]:f,[`${e}-card--content${typeof r!="boolean"&&r.content==="soft"?"-soft":""}-segmented`]:r===!0||r!==!1&&r.content,[`${e}-card--footer${typeof r!="boolean"&&r.footer==="soft"?"-soft":""}-segmented`]:r===!0||r!==!1&&r.footer,[`${e}-card--action-segmented`]:r===!0||r!==!1&&r.action,[`${e}-card--bordered`]:v,[`${e}-card--hoverable`]:g}],style:this.cssVars,role:this.role},c(a.cover,o=>o&&l("div",{class:`${e}-card-cover`,role:"none"},o)),c(a.header,o=>o||this.title||this.closable?l("div",{class:`${e}-card-header`,style:this.headerStyle},l("div",{class:`${e}-card-header__main`,role:"heading"},o||this.title),c(a["header-extra"],s=>s&&l("div",{class:`${e}-card-header__extra`,style:this.headerExtraStyle},s)),this.closable?l(te,{clsPrefix:e,class:`${e}-card-header__close`,onClick:this.handleCloseClick,absolute:!0}):null):null),c(a.default,o=>o&&l("div",{class:`${e}-card__content`,style:this.contentStyle,role:"none"},o)),c(a.footer,o=>o&&[l("div",{class:`${e}-card__footer`,style:this.footerStyle,role:"none"},o)]),c(a.action,o=>o&&l("div",{class:`${e}-card__action`,role:"none"},o)))}});export{me as N,fe as a,x as c};
