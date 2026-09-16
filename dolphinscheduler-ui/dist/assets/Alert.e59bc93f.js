import{a6 as M,cx as N,ai as f,ad as u,l as T,p as i,n as $,bT as O,k as V,d as q,b as D,e as H,f as K,g as E,t as G,r as J,h as t,am as Q,N as U,a3 as X,at as Y,as as Z,aq as oo,ar as eo,ak as ro,j as c}from"./index.e2a499a0.js";import{b as no,r as so}from"./resolve-slot.8e13efbe.js";import{a as to}from"./index.62f1e1b0.js";const lo=r=>{const{lineHeight:e,borderRadius:d,fontWeightStrong:b,baseColor:l,dividerColor:C,actionColor:P,textColor1:g,textColor2:s,closeColorHover:h,closeColorPressed:v,closeIconColor:m,closeIconColorHover:p,closeIconColorPressed:n,infoColor:o,successColor:I,warningColor:x,errorColor:z,fontSize:S}=r;return Object.assign(Object.assign({},N),{fontSize:S,lineHeight:e,titleFontWeight:b,borderRadius:d,border:`1px solid ${C}`,color:P,titleTextColor:g,iconColor:s,contentTextColor:s,closeBorderRadius:d,closeColorHover:h,closeColorPressed:v,closeIconColor:m,closeIconColorHover:p,closeIconColorPressed:n,borderInfo:`1px solid ${f(l,u(o,{alpha:.25}))}`,colorInfo:f(l,u(o,{alpha:.08})),titleTextColorInfo:g,iconColorInfo:o,contentTextColorInfo:s,closeColorHoverInfo:h,closeColorPressedInfo:v,closeIconColorInfo:m,closeIconColorHoverInfo:p,closeIconColorPressedInfo:n,borderSuccess:`1px solid ${f(l,u(I,{alpha:.25}))}`,colorSuccess:f(l,u(I,{alpha:.08})),titleTextColorSuccess:g,iconColorSuccess:I,contentTextColorSuccess:s,closeColorHoverSuccess:h,closeColorPressedSuccess:v,closeIconColorSuccess:m,closeIconColorHoverSuccess:p,closeIconColorPressedSuccess:n,borderWarning:`1px solid ${f(l,u(x,{alpha:.33}))}`,colorWarning:f(l,u(x,{alpha:.08})),titleTextColorWarning:g,iconColorWarning:x,contentTextColorWarning:s,closeColorHoverWarning:h,closeColorPressedWarning:v,closeIconColorWarning:m,closeIconColorHoverWarning:p,closeIconColorPressedWarning:n,borderError:`1px solid ${f(l,u(z,{alpha:.25}))}`,colorError:f(l,u(z,{alpha:.08})),titleTextColorError:g,iconColorError:z,contentTextColorError:s,closeColorHoverError:h,closeColorPressedError:v,closeIconColorError:m,closeIconColorHoverError:p,closeIconColorPressedError:n})},io={name:"Alert",common:M,self:lo},ao=io,co=T("alert",`
 line-height: var(--n-line-height);
 border-radius: var(--n-border-radius);
 position: relative;
 transition: background-color .3s var(--n-bezier);
 background-color: var(--n-color);
 text-align: start;
 word-break: break-word;
`,[i("border",`
 border-radius: inherit;
 position: absolute;
 left: 0;
 right: 0;
 top: 0;
 bottom: 0;
 transition: border-color .3s var(--n-bezier);
 border: var(--n-border);
 pointer-events: none;
 `),$("closable",[T("alert-body",[i("title",`
 padding-right: 24px;
 `)])]),i("icon",{color:"var(--n-icon-color)"}),T("alert-body",{padding:"var(--n-padding)"},[i("title",{color:"var(--n-title-text-color)"}),i("content",{color:"var(--n-content-text-color)"})]),O({originalTransition:"transform .3s var(--n-bezier)",enterToProps:{transform:"scale(1)"},leaveToProps:{transform:"scale(0.9)"}}),i("icon",`
 position: absolute;
 left: 0;
 top: 0;
 align-items: center;
 justify-content: center;
 display: flex;
 width: var(--n-icon-size);
 height: var(--n-icon-size);
 font-size: var(--n-icon-size);
 margin: var(--n-icon-margin);
 `),i("close",`
 transition:
 color .3s var(--n-bezier),
 background-color .3s var(--n-bezier);
 position: absolute;
 right: 0;
 top: 0;
 margin: var(--n-close-margin);
 `),$("show-icon",[T("alert-body",{paddingLeft:"calc(var(--n-icon-margin-left) + var(--n-icon-size) + var(--n-icon-margin-right))"})]),T("alert-body",`
 border-radius: var(--n-border-radius);
 transition: border-color .3s var(--n-bezier);
 `,[i("title",`
 transition: color .3s var(--n-bezier);
 font-size: 16px;
 line-height: 19px;
 font-weight: var(--n-title-font-weight);
 `,[V("& +",[i("content",{marginTop:"9px"})])]),i("content",{transition:"color .3s var(--n-bezier)",fontSize:"var(--n-font-size)"})]),i("icon",{transition:"color .3s var(--n-bezier)"})]),go=Object.assign(Object.assign({},H.props),{title:String,showIcon:{type:Boolean,default:!0},type:{type:String,default:"default"},bordered:{type:Boolean,default:!0},closable:Boolean,onClose:Function,onAfterLeave:Function,onAfterHide:Function}),Co=q({name:"Alert",inheritAttrs:!1,props:go,setup(r){const{mergedClsPrefixRef:e,mergedBorderedRef:d,inlineThemeDisabled:b,mergedRtlRef:l}=D(r),C=H("Alert","-alert",co,ao,r,e),P=K("Alert",l,e),g=E(()=>{const{common:{cubicBezierEaseInOut:n},self:o}=C.value,{fontSize:I,borderRadius:x,titleFontWeight:z,lineHeight:S,iconSize:R,iconMargin:y,iconMarginRtl:A,closeIconSize:W,closeBorderRadius:w,closeSize:B,closeMargin:_,closeMarginRtl:k,padding:L}=o,{type:a}=r,{left:j,right:F}=to(y);return{"--n-bezier":n,"--n-color":o[c("color",a)],"--n-close-icon-size":W,"--n-close-border-radius":w,"--n-close-color-hover":o[c("closeColorHover",a)],"--n-close-color-pressed":o[c("closeColorPressed",a)],"--n-close-icon-color":o[c("closeIconColor",a)],"--n-close-icon-color-hover":o[c("closeIconColorHover",a)],"--n-close-icon-color-pressed":o[c("closeIconColorPressed",a)],"--n-icon-color":o[c("iconColor",a)],"--n-border":o[c("border",a)],"--n-title-text-color":o[c("titleTextColor",a)],"--n-content-text-color":o[c("contentTextColor",a)],"--n-line-height":S,"--n-border-radius":x,"--n-font-size":I,"--n-title-font-weight":z,"--n-icon-size":R,"--n-icon-margin":y,"--n-icon-margin-rtl":A,"--n-close-size":B,"--n-close-margin":_,"--n-close-margin-rtl":k,"--n-padding":L,"--n-icon-margin-left":j,"--n-icon-margin-right":F}}),s=b?G("alert",E(()=>r.type[0]),g,r):void 0,h=J(!0),v=()=>{const{onAfterLeave:n,onAfterHide:o}=r;n&&n(),o&&o()};return{rtlEnabled:P,mergedClsPrefix:e,mergedBordered:d,visible:h,handleCloseClick:()=>{var n;Promise.resolve((n=r.onClose)===null||n===void 0?void 0:n.call(r)).then(o=>{o!==!1&&(h.value=!1)})},handleAfterLeave:()=>{v()},mergedTheme:C,cssVars:b?void 0:g,themeClass:s==null?void 0:s.themeClass,onRender:s==null?void 0:s.onRender}},render(){var r;return(r=this.onRender)===null||r===void 0||r.call(this),t(ro,{onAfterLeave:this.handleAfterLeave},{default:()=>{const{mergedClsPrefix:e,$slots:d}=this,b={class:[`${e}-alert`,this.themeClass,this.closable&&`${e}-alert--closable`,this.showIcon&&`${e}-alert--show-icon`,this.rtlEnabled&&`${e}-alert--rtl`],style:this.cssVars,role:"alert"};return this.visible?t("div",Object.assign({},Q(this.$attrs,b)),this.closable&&t(U,{clsPrefix:e,class:`${e}-alert__close`,onClick:this.handleCloseClick}),this.bordered&&t("div",{class:`${e}-alert__border`}),this.showIcon&&t("div",{class:`${e}-alert__icon`,"aria-hidden":"true"},no(d.icon,()=>[t(X,{clsPrefix:e},{default:()=>{switch(this.type){case"success":return t(eo,null);case"info":return t(oo,null);case"warning":return t(Z,null);case"error":return t(Y,null);default:return null}}})])),t("div",{class:[`${e}-alert-body`,this.mergedBordered&&`${e}-alert-body--bordered`]},so(d.header,l=>{const C=l||this.title;return C?t("div",{class:`${e}-alert-body__title`},C):null}),d.default&&t("div",{class:`${e}-alert-body__content`},d))):null}})}});export{Co as N};
