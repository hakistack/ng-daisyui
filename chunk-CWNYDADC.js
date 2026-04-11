import{a as S}from"./chunk-7NFJGNQ6.js";import{a as g,b as k,c as D}from"./chunk-LF3XQDBE.js";import{Ac as C,C as y,E as r,G as l,N as h,O as t,c as T,cc as x,d,e as m,i as v,l as a,n as w,q as b,r as _,v as p,w as i,x as e,y as u}from"./chunk-XEMU7XGV.js";import"./chunk-DAQOROHW.js";function V(c,f){if(c&1){let o=y();i(0,"div",4)(1,"app-doc-section",6)(2,"div",7)(3,"button",8),r("click",function(){d(o);let n=l();return m(n.showSuccess())}),u(4,"hk-lucide-icon",9),t(5," Success "),e(),i(6,"button",10),r("click",function(){d(o);let n=l();return m(n.showError())}),u(7,"hk-lucide-icon",11),t(8," Error "),e(),i(9,"button",12),r("click",function(){d(o);let n=l();return m(n.showWarning())}),u(10,"hk-lucide-icon",13),t(11," Warning "),e(),i(12,"button",14),r("click",function(){d(o);let n=l();return m(n.showInfo())}),u(13,"hk-lucide-icon",15),t(14," Info "),e()()(),i(15,"app-doc-section",16)(16,"div",7)(17,"button",17),r("click",function(){d(o);let n=l();return m(n.showWithDetail())}),t(18,"Show with Detail"),e(),i(19,"button",17),r("click",function(){d(o);let n=l();return m(n.showLongMessage())}),t(20,"Long Message"),e()()()()}if(c&2){let o=l();a(),p("codeExample",o.severityCode),a(3),p("size",18),a(3),p("size",18),a(3),p("size",18),a(3),p("size",18),a(2),p("codeExample",o.detailCode)}}function A(c,f){if(c&1){let o=y();i(0,"div",4)(1,"app-doc-section",18)(2,"div",7)(3,"button",17),r("click",function(){d(o);let n=l();return m(n.showWithAction())}),t(4,"Single Action"),e(),i(5,"button",17),r("click",function(){d(o);let n=l();return m(n.showWithMultipleActions())}),t(6,"Multiple Actions"),e(),i(7,"button",17),r("click",function(){d(o);let n=l();return m(n.showUndoAction())}),t(8,"Undo Action"),e()()(),i(9,"app-doc-section",19)(10,"div",7)(11,"button",17),r("click",function(){d(o);let n=l();return m(n.showShort())}),t(12,"Short (2s)"),e(),i(13,"button",17),r("click",function(){d(o);let n=l();return m(n.showMedium())}),t(14,"Medium (5s)"),e(),i(15,"button",17),r("click",function(){d(o);let n=l();return m(n.showLong())}),t(16,"Long (10s)"),e()()(),i(17,"app-doc-section",20)(18,"div",7)(19,"button",17),r("click",function(){d(o);let n=l();return m(n.showWithProgress())}),t(20,"With Progress Bar"),e(),i(21,"button",17),r("click",function(){d(o);let n=l();return m(n.showWithoutProgress())}),t(22,"Without Progress Bar"),e()()(),i(23,"app-doc-section",21)(24,"div",7)(25,"button",17),r("click",function(){d(o);let n=l();return m(n.showSticky())}),t(26,"Show Sticky Toast"),e()()()()}if(c&2){let o=l();a(),p("codeExample",o.actionCode),a(22),p("codeExample",o.stickyCode)}}function P(c,f){if(c&1){let o=y();i(0,"div",4)(1,"app-doc-section",22)(2,"div",7)(3,"button",23),r("click",function(){d(o);let n=l();return m(n.showSoftSuccess())}),t(4,"Soft Success"),e(),i(5,"button",24),r("click",function(){d(o);let n=l();return m(n.showSoftError())}),t(6,"Soft Error"),e(),i(7,"button",25),r("click",function(){d(o);let n=l();return m(n.showSoftWarning())}),t(8,"Soft Warning"),e(),i(9,"button",26),r("click",function(){d(o);let n=l();return m(n.showSoftInfo())}),t(10,"Soft Info"),e()()(),i(11,"app-doc-section",27)(12,"div",7)(13,"button",17),r("click",function(){d(o);let n=l();return m(n.showTapToDismiss())}),t(14,"Tap to Dismiss"),e(),i(15,"button",17),r("click",function(){d(o);let n=l();return m(n.showNoTapToDismiss())}),t(16,"No Tap to Dismiss"),e()()()()}if(c&2){let o=l();a(),p("codeExample",o.softCode)}}function O(c,f){if(c&1){let o=y();i(0,"div",4)(1,"app-doc-section",28)(2,"div",7)(3,"button",23),r("click",function(){d(o);let n=l();return m(n.showOnline())}),u(4,"hk-lucide-icon",29),t(5," Online "),e(),i(6,"button",24),r("click",function(){d(o);let n=l();return m(n.showOffline())}),u(7,"hk-lucide-icon",30),t(8," Offline "),e()()(),i(9,"app-doc-section",31)(10,"div",7)(11,"button",32),r("click",function(){d(o);let n=l();return m(n.showMultiple())}),t(12,"Show 3 Toasts"),e(),i(13,"button",33),r("click",function(){d(o);let n=l();return m(n.clearAll())}),t(14,"Clear All"),e()()()()}if(c&2){let o=l();a(),p("codeExample",o.networkCode),a(3),p("size",18),a(3),p("size",18)}}function I(c,f){if(c&1&&(i(0,"div",4),u(1,"app-api-table",34),i(2,"div",35)(3,"div",36)(4,"h3",37),t(5,"Usage"),e(),i(6,"p",38),t(7," Inject "),i(8,"code"),t(9,"ToastService"),e(),t(10," and call convenience methods for common severities, or use "),i(11,"code"),t(12,"show()"),e(),t(13," for full control. All methods return the toast ID as a "),i(14,"code"),t(15,"string"),e(),t(16,", which can be used with "),i(17,"code"),t(18,"dismiss()"),e(),t(19," and "),i(20,"code"),t(21,"pauseAutoDismiss()"),e(),t(22,"/"),i(23,"code"),t(24,"resumeAutoDismiss()"),e(),t(25,". "),e(),u(26,"app-code-block",39),e()()()),c&2){let o=l();a(),p("entries",o.methodDocs),a(25),p("code",o.usageCode)}}function M(c,f){if(c&1&&(i(0,"div",4),u(1,"app-api-table",40)(2,"app-api-table",41),e()),c&2){let o=l();a(),p("entries",o.optionDocs),a(),p("entries",o.actionDocs)}}function W(c,f){if(c&1&&(i(0,"div",4),u(1,"app-api-table",42),i(2,"div",35)(3,"div",36)(4,"h3",37),t(5,"Provider Setup"),e(),i(6,"p",38),t(7," Use "),i(8,"code"),t(9,"provideToast()"),e(),t(10," in your application config to set global defaults for all toasts. Alternatively, use the "),i(11,"code"),t(12,"TOAST_CONFIG"),e(),t(13," injection token directly for more control. Without configuration, the service uses sensible defaults (bottom-end position, 5s duration, max 5 toasts). "),e(),u(14,"app-code-block",39),e()()()),c&2){let o=l();a(),p("entries",o.globalConfigDocs),a(13),p("code",o.providerCode)}}function B(c,f){if(c&1&&(i(0,"div",4)(1,"div",35)(2,"div",36)(3,"h3",37),t(4,"ToastSeverity"),e(),u(5,"app-code-block",39),e()(),i(6,"div",35)(7,"div",36)(8,"h3",37),t(9,"ToastPosition"),e(),u(10,"app-code-block",39),e()(),i(11,"div",35)(12,"div",36)(13,"h3",37),t(14,"ToastOptions"),e(),i(15,"p",38),t(16," Full options object passed to "),i(17,"code"),t(18,"show()"),e(),t(19,". Convenience methods like "),i(20,"code"),t(21,"success()"),e(),t(22," set the severity automatically. "),e(),u(23,"app-code-block",39),e()(),i(24,"div",35)(25,"div",36)(26,"h3",37),t(27,"ToastAction"),e(),i(28,"p",38),t(29," Action button configuration for interactive toasts. Max 2 actions recommended for visual clarity. "),e(),u(30,"app-code-block",39),e()(),i(31,"div",35)(32,"div",36)(33,"h3",37),t(34,"ToastGlobalConfig"),e(),i(35,"p",38),t(36," Global configuration passed to "),i(37,"code"),t(38,"provideToast()"),e(),t(39," or provided via "),i(40,"code"),t(41,"TOAST_CONFIG"),e(),t(42," injection token. "),e(),u(43,"app-code-block",39),e()()()),c&2){let o=l();a(5),p("code",o.typeToastSeverity),a(5),p("code",o.typeToastPosition),a(13),p("code",o.typeToastOptions),a(7),p("code",o.typeToastAction),a(13),p("code",o.typeToastGlobalConfig)}}var E=class c{toast=T(C);activeTab=v("basic");apiTab=v("methods");showSuccess(){this.toast.success("Operation successful!")}showError(){this.toast.error("Something went wrong!")}showWarning(){this.toast.warning("Please review your input")}showInfo(){this.toast.info("New updates available")}showWithDetail(){this.toast.success("File uploaded","Your document has been successfully uploaded to the server.")}showLongMessage(){this.toast.info("System Maintenance","The system will undergo scheduled maintenance on Saturday from 2:00 AM to 6:00 AM EST. Please save your work before this time.")}showWithAction(){this.toast.show({severity:"info",summary:"New message received",detail:"You have 1 unread message",actions:[{label:"View",onClick:()=>console.log("View clicked"),style:"primary"}]})}showWithMultipleActions(){this.toast.show({severity:"warning",summary:"Unsaved changes",detail:"You have unsaved changes that will be lost.",actions:[{label:"Discard",onClick:()=>console.log("Discard clicked"),style:"ghost"},{label:"Save",onClick:()=>console.log("Save clicked"),style:"primary"}]})}showUndoAction(){this.toast.show({severity:"success",summary:"Item deleted",detail:"The item has been moved to trash.",life:8e3,actions:[{label:"Undo",onClick:()=>this.toast.info("Undo successful","Item restored"),style:"primary"}]})}showSticky(){this.toast.show({severity:"warning",summary:"Important Notice",detail:"This toast will not auto-dismiss. You must close it manually.",sticky:!0})}showShort(){this.toast.show({severity:"info",summary:"Quick notification",life:2e3})}showMedium(){this.toast.show({severity:"info",summary:"Medium notification",life:5e3})}showLong(){this.toast.show({severity:"info",summary:"Long notification",detail:"This will stay visible for 10 seconds.",life:1e4})}showWithProgress(){this.toast.show({severity:"info",summary:"With progress bar",detail:"Watch the progress indicator",progressBar:!0,life:5e3})}showWithoutProgress(){this.toast.show({severity:"info",summary:"Without progress bar",progressBar:!1,life:5e3})}showSoftSuccess(){this.toast.show({severity:"success",summary:"Soft success",soft:!0})}showSoftError(){this.toast.show({severity:"error",summary:"Soft error",soft:!0})}showSoftWarning(){this.toast.show({severity:"warning",summary:"Soft warning",soft:!0})}showSoftInfo(){this.toast.show({severity:"info",summary:"Soft info",soft:!0})}showOnline(){this.toast.networkStatus("online")}showOffline(){this.toast.networkStatus("offline")}showTapToDismiss(){this.toast.show({severity:"info",summary:"Tap anywhere to dismiss",tapToDismiss:!0,life:1e4})}showNoTapToDismiss(){this.toast.show({severity:"info",summary:"Use X button to dismiss",tapToDismiss:!1,life:1e4})}showMultiple(){this.toast.success("First toast"),setTimeout(()=>this.toast.info("Second toast"),300),setTimeout(()=>this.toast.warning("Third toast"),600)}clearAll(){this.toast.clear()}severityCode=`private toast = inject(ToastService);

this.toast.success('Operation successful!');
this.toast.error('Something went wrong!');
this.toast.warning('Please review your input');
this.toast.info('New updates available');`;detailCode="this.toast.success('File uploaded', 'Your document has been successfully uploaded.');";actionCode=`this.toast.show({
  severity: 'info',
  summary: 'New message received',
  detail: 'You have 1 unread message',
  actions: [
    {
      label: 'View',
      onClick: () => console.log('View clicked'),
      style: 'primary',
    },
  ],
});`;stickyCode=`this.toast.show({
  severity: 'warning',
  summary: 'Important Notice',
  detail: 'This toast will not auto-dismiss.',
  sticky: true,
});`;softCode=`this.toast.show({
  severity: 'success',
  summary: 'Soft success',
  soft: true,
});`;networkCode=`this.toast.networkStatus('online');
this.toast.networkStatus('offline');`;usageCode=`import { ToastService } from '@hakistack/ng-daisyui';

// Inject the service
private toast = inject(ToastService);

// Quick methods
this.toast.success('Title', 'Optional detail');
this.toast.error('Title', 'Optional detail');
this.toast.warning('Title', 'Optional detail');
this.toast.info('Title', 'Optional detail');

// Full options
this.toast.show({
  severity: 'info',
  summary: 'Title',
  detail: 'Detail text',
  life: 5000,
  sticky: false,
  progressBar: true,
  tapToDismiss: true,
  soft: false,
  actions: [
    { label: 'Undo', onClick: () => {}, style: 'primary' },
  ],
});

// Utilities
this.toast.networkStatus('online');
this.toast.clear();`;providerCode=`import { provideToast } from '@hakistack/ng-daisyui';

// In app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideToast({
      position: 'top-end',
      maxToasts: 3,
      defaultLife: 4000,
      preventDuplicates: true,
    })
  ]
};

// Or use the injection token directly
import { TOAST_CONFIG, ToastGlobalConfig } from '@hakistack/ng-daisyui';

providers: [
  {
    provide: TOAST_CONFIG,
    useValue: {
      maxToasts: 3,
      position: 'top-end',
    } as Partial<ToastGlobalConfig>
  }
]`;methodDocs=[{name:"show(options)",type:"string",description:"Show a toast with full ToastOptions. Returns the toast ID"},{name:"success(summary, detail?, options?)",type:"string",description:"Show a success toast. Returns the toast ID"},{name:"error(summary, detail?, options?)",type:"string",description:"Show an error toast. Returns the toast ID"},{name:"warning(summary, detail?, options?)",type:"string",description:"Show a warning toast. Returns the toast ID"},{name:"info(summary, detail?, options?)",type:"string",description:"Show an info toast. Returns the toast ID"},{name:"networkStatus(status)",type:"string",description:"Show online/offline status toast. Pass 'online' or 'offline'"},{name:"dismiss(id)",type:"void",description:"Dismiss a specific toast by its ID (with exit animation)"},{name:"clear()",type:"void",description:"Remove all active toasts immediately"},{name:"pauseAutoDismiss(id)",type:"void",description:"Pause the auto-dismiss timer for a toast (used on hover)"},{name:"resumeAutoDismiss(id)",type:"void",description:"Resume the auto-dismiss timer for a toast (used on hover end)"},{name:"handleToastClick(id)",type:"void",description:"Handle toast body click (calls onTap, dismisses if tapToDismiss)"},{name:"handleActionClick(id, action)",type:"void",description:"Handle action button click (calls onClick, dismisses unless dismissOnClick is false)"}];optionDocs=[{name:"severity",type:"ToastSeverity",description:"Toast severity: 'success' | 'error' | 'warning' | 'info' (required)"},{name:"summary",type:"string",description:"Main toast message text (required)"},{name:"detail",type:"string",default:"-",description:"Optional detailed message shown below summary"},{name:"life",type:"number",default:"5000",description:"Duration in ms before auto-dismiss"},{name:"sticky",type:"boolean",default:"false",description:"If true, toast won't auto-dismiss (must be closed manually)"},{name:"soft",type:"boolean",default:"false",description:"Use soft/muted styling variant"},{name:"progressBar",type:"boolean",default:"true (from config)",description:"Show countdown progress bar indicator"},{name:"pauseOnHover",type:"boolean",default:"true (from config)",description:"Pause auto-dismiss timer when hovering"},{name:"tapToDismiss",type:"boolean",default:"false (from config)",description:"Allow clicking anywhere on toast to dismiss"},{name:"onTap",type:"() => void",default:"-",description:"Callback when toast body is clicked"},{name:"actions",type:"ToastAction[]",default:"-",description:"Action buttons to display (max 2 recommended)"}];actionDocs=[{name:"label",type:"string",description:"Button label text (required)"},{name:"onClick",type:"() => void",description:"Click handler callback (required)"},{name:"dismissOnClick",type:"boolean",default:"true",description:"Whether to dismiss the toast after action click"},{name:"style",type:"'default' | 'primary' | 'ghost'",default:"'default'",description:"Button style variant"}];globalConfigDocs=[{name:"maxToasts",type:"number",default:"5",description:"Maximum number of toasts displayed simultaneously (0 = unlimited)"},{name:"defaultLife",type:"number",default:"5000",description:"Default duration in ms before auto-dismiss"},{name:"exitDuration",type:"number",default:"300",description:"Duration of exit animation in milliseconds"},{name:"position",type:"ToastPosition",default:"'bottom-end'",description:"Default position for toast container"},{name:"preventDuplicates",type:"boolean",default:"true",description:"Prevent showing duplicate toasts with same severity and summary"},{name:"progressBar",type:"boolean",default:"true",description:"Show progress bar countdown indicator on all toasts"},{name:"pauseOnHover",type:"boolean",default:"true",description:"Pause auto-dismiss timer when hovering over any toast"},{name:"extendedTimeOut",type:"number",default:"1000",description:"Additional time (ms) after hover ends before auto-dismiss"},{name:"tapToDismiss",type:"boolean",default:"false",description:"Allow clicking anywhere on toast to dismiss (global default)"},{name:"autoDismiss",type:"boolean",default:"true",description:"Automatically dismiss oldest toast when maxToasts limit is reached"}];severityTypeDocs=[{name:"'success'",type:"ToastSeverity",description:"Green success notification"},{name:"'error'",type:"ToastSeverity",description:"Red error notification"},{name:"'warning'",type:"ToastSeverity",description:"Yellow/amber warning notification"},{name:"'info'",type:"ToastSeverity",description:"Blue informational notification"}];positionTypeDocs=[{name:"'top-start'",type:"ToastPosition",description:"Top-left corner"},{name:"'top-center'",type:"ToastPosition",description:"Top center"},{name:"'top-end'",type:"ToastPosition",description:"Top-right corner"},{name:"'bottom-start'",type:"ToastPosition",description:"Bottom-left corner"},{name:"'bottom-center'",type:"ToastPosition",description:"Bottom center"},{name:"'bottom-end'",type:"ToastPosition",description:"Bottom-right corner (default)"}];typeToastSeverity="type ToastSeverity = 'success' | 'info' | 'warning' | 'error';";typeToastPosition=`type ToastPosition =
  | 'top-start'      // Top-left corner
  | 'top-center'     // Top center
  | 'top-end'        // Top-right corner
  | 'bottom-start'   // Bottom-left corner
  | 'bottom-center'  // Bottom center
  | 'bottom-end';    // Bottom-right corner (default)`;typeToastOptions=`interface ToastOptions {
  /** Toast severity/type (required) */
  severity: ToastSeverity;

  /** Main toast message (required) */
  summary: string;

  /** Optional detailed message shown below summary */
  detail?: string;

  /** Duration in ms before auto-dismiss (default: 5000) */
  life?: number;

  /** If true, toast won't auto-dismiss (default: false) */
  sticky?: boolean;

  /** Use soft/muted styling variant (default: false) */
  soft?: boolean;

  /** Show countdown progress bar (default: true from config) */
  progressBar?: boolean;

  /** Pause auto-dismiss on hover (default: true from config) */
  pauseOnHover?: boolean;

  /** Click anywhere on toast to dismiss (default: false from config) */
  tapToDismiss?: boolean;

  /** Callback when toast body is clicked */
  onTap?: () => void;

  /** Action buttons to display (max 2 recommended) */
  actions?: ToastAction[];
}`;typeToastAction=`interface ToastAction {
  /** Button label text (required) */
  label: string;

  /** Click handler callback (required) */
  onClick: () => void;

  /** Dismiss toast after action click (default: true) */
  dismissOnClick?: boolean;

  /** Button style variant (default: 'default') */
  style?: 'default' | 'primary' | 'ghost';
}`;typeToastGlobalConfig=`interface ToastGlobalConfig {
  /** Max toasts displayed simultaneously, 0 = unlimited (default: 5) */
  maxToasts: number;

  /** Default duration in ms before auto-dismiss (default: 5000) */
  defaultLife: number;

  /** Exit animation duration in ms (default: 300) */
  exitDuration: number;

  /** Default position for toast container (default: 'bottom-end') */
  position: ToastPosition;

  /** Prevent duplicate toasts with same severity+summary (default: true) */
  preventDuplicates: boolean;

  /** Show progress bar countdown on all toasts (default: true) */
  progressBar: boolean;

  /** Pause auto-dismiss on hover for all toasts (default: true) */
  pauseOnHover: boolean;

  /** Additional time in ms after hover ends (default: 1000) */
  extendedTimeOut: number;

  /** Allow clicking anywhere on toast to dismiss (default: false) */
  tapToDismiss: boolean;

  /** Auto-dismiss oldest when maxToasts reached (default: true) */
  autoDismiss: boolean;
}`;static \u0275fac=function(o){return new(o||c)};static \u0275cmp=w({type:c,selectors:[["app-toast-demo"]],decls:29,vars:24,consts:[["title","Toast Notifications","description","Non-blocking notifications with actions and progress","icon","Bell","category","Feedback","importName","ToastService"],["examples",""],["role","tablist",1,"tabs","tabs-box","tabs-boxed"],["role","tab",1,"tab",3,"click"],[1,"space-y-6"],["api",""],["title","Severity Levels","description","Different severity levels for various contexts",3,"codeExample"],[1,"flex","flex-wrap","gap-3"],[1,"btn","btn-success",3,"click"],["name","CircleCheck",3,"size"],[1,"btn","btn-error",3,"click"],["name","CircleX",3,"size"],[1,"btn","btn-warning",3,"click"],["name","TriangleAlert",3,"size"],[1,"btn","btn-info",3,"click"],["name","Info",3,"size"],["title","With Details","description","Include additional context",3,"codeExample"],[1,"btn","btn-outline",3,"click"],["title","With Actions","description","Interactive toast with buttons",3,"codeExample"],["title","Custom Duration","description","Control how long the toast is visible"],["title","Progress Bar","description","Show remaining time visually"],["title","Sticky Toast","description","Won't auto-dismiss until closed manually",3,"codeExample"],["title","Soft Style","description","Muted, less prominent styling",3,"codeExample"],[1,"btn","btn-outline","btn-success",3,"click"],[1,"btn","btn-outline","btn-error",3,"click"],[1,"btn","btn-outline","btn-warning",3,"click"],[1,"btn","btn-outline","btn-info",3,"click"],["title","Tap to Dismiss","description","Click anywhere on toast to close"],["title","Network Status","description","Built-in online/offline notifications",3,"codeExample"],["name","Wifi",3,"size"],["name","WifiOff",3,"size"],["title","Bulk Operations","description","Manage multiple toasts"],[1,"btn","btn-primary",3,"click"],[1,"btn","btn-ghost",3,"click"],["title","ToastService Methods",3,"entries"],[1,"card","card-border","card-bordered","bg-base-100"],[1,"card-body","gap-3"],[1,"card-title","text-lg"],[1,"text-sm","text-base-content/70"],[3,"code"],["title","ToastOptions",3,"entries"],["title","ToastAction",3,"entries"],["title","ToastGlobalConfig (provideToast)",3,"entries"]],template:function(o,s){o&1&&(i(0,"app-demo-page",0)(1,"div",1)(2,"div",2)(3,"button",3),r("click",function(){return s.activeTab.set("basic")}),t(4,"Basic"),e(),i(5,"button",3),r("click",function(){return s.activeTab.set("features")}),t(6," Features "),e(),i(7,"button",3),r("click",function(){return s.activeTab.set("styles")}),t(8,"Styles"),e(),i(9,"button",3),r("click",function(){return s.activeTab.set("advanced")}),t(10," Advanced "),e()(),b(11,V,21,6,"div",4),b(12,A,27,2,"div",4),b(13,P,17,1,"div",4),b(14,O,15,3,"div",4),e(),i(15,"div",5)(16,"div",2)(17,"button",3),r("click",function(){return s.apiTab.set("methods")}),t(18," Service Methods "),e(),i(19,"button",3),r("click",function(){return s.apiTab.set("configuration")}),t(20," Configuration "),e(),i(21,"button",3),r("click",function(){return s.apiTab.set("provider")}),t(22," Provider Setup "),e(),i(23,"button",3),r("click",function(){return s.apiTab.set("types")}),t(24,"Types"),e()(),b(25,I,27,2,"div",4),b(26,M,3,2,"div",4),b(27,W,15,2,"div",4),b(28,B,44,5,"div",4),e()()),o&2&&(a(3),h("tab-active",s.activeTab()==="basic"),a(2),h("tab-active",s.activeTab()==="features"),a(2),h("tab-active",s.activeTab()==="styles"),a(2),h("tab-active",s.activeTab()==="advanced"),a(2),_(s.activeTab()==="basic"?11:-1),a(),_(s.activeTab()==="features"?12:-1),a(),_(s.activeTab()==="styles"?13:-1),a(),_(s.activeTab()==="advanced"?14:-1),a(3),h("tab-active",s.apiTab()==="methods"),a(2),h("tab-active",s.apiTab()==="configuration"),a(2),h("tab-active",s.apiTab()==="provider"),a(2),h("tab-active",s.apiTab()==="types"),a(2),_(s.apiTab()==="methods"?25:-1),a(),_(s.apiTab()==="configuration"?26:-1),a(),_(s.apiTab()==="provider"?27:-1),a(),_(s.apiTab()==="types"?28:-1))},dependencies:[x,k,S,g,D],encapsulation:2})};export{E as ToastDemoComponent};
