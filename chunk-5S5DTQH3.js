import{a as q}from"./chunk-7NFJGNQ6.js";import{a as J,b as X,c as Q}from"./chunk-LF3XQDBE.js";import{Aa as V,Ba as G,Bc as w,C as R,Cc as I,E as m,G as p,Ha as K,Ic as Y,N as f,O as t,P as _,Q as S,U as x,V as k,W as E,aa as L,b as T,ba as P,c as v,cc as C,d as h,e as y,fc as H,i as M,ja as F,l as a,n as D,q as g,r as b,v as r,va as N,w as i,wa as W,x as e,xa as B,y as c,ya as U}from"./chunk-XEMU7XGV.js";import"./chunk-DAQOROHW.js";function $(l,d){if(l&1&&(i(0,"div",11),c(1,"hk-lucide-icon",18),i(2,"span"),t(3),e()()),l&2){let n=p(2);a(),r("size",18),a(2),S("Dialog result: ",n.simpleResult)}}function ee(l,d){if(l&1&&(i(0,"div",19),c(1,"hk-lucide-icon",20),i(2,"span"),t(3),e()()),l&2){let n=p(2);f("alert-success",n.termsResult==="accepted")("alert-warning",n.termsResult!=="accepted"),a(),r("name",n.termsResult==="accepted"?"Check":"X")("size",18),a(2),S("Terms ",n.termsResult==="accepted"?"accepted":"declined")}}function te(l,d){if(l&1){let n=R();i(0,"div",4)(1,"app-doc-section",7)(2,"div",8)(3,"button",9),m("click",function(){h(n);let s=p();return y(s.openSimpleDialog())}),c(4,"hk-lucide-icon",10),t(5," Open Simple Dialog "),e()(),g(6,$,4,2,"div",11),e(),i(7,"app-doc-section",12)(8,"div",8)(9,"button",13),m("click",function(){h(n);let s=p();return y(s.openDataDialog())}),c(10,"hk-lucide-icon",14),t(11," View User Details "),e()()(),i(12,"app-doc-section",15)(13,"div",8)(14,"button",13),m("click",function(){h(n);let s=p();return y(s.openLongContentDialog())}),c(15,"hk-lucide-icon",16),t(16," View Terms of Service "),e()(),g(17,ee,4,7,"div",17),e()()}if(l&2){let n=p();a(),r("codeExample",n.basicCode),a(3),r("size",18),a(2),b(n.simpleResult?6:-1),a(),r("codeExample",n.dataCode),a(3),r("size",18),a(5),r("size",18),a(2),b(n.termsResult?17:-1)}}function ie(l,d){if(l&1&&(i(0,"div",24),c(1,"hk-lucide-icon",25),i(2,"span"),t(3),L(4,"json"),e()()),l&2){let n=p(2);a(),r("size",18),a(2),S("Saved: ",P(4,2,n.formResult))}}function ne(l,d){if(l&1){let n=R();i(0,"app-doc-section",5)(1,"div",8)(2,"button",21),m("click",function(){h(n);let s=p();return y(s.openFormDialog("create"))}),c(3,"hk-lucide-icon",22),t(4," Create User "),e(),i(5,"button",13),m("click",function(){h(n);let s=p();return y(s.openFormDialog("edit"))}),c(6,"hk-lucide-icon",23),t(7," Edit User "),e()(),g(8,ie,5,4,"div",24),e()}if(l&2){let n=p();r("codeExample",n.formCode),a(3),r("size",18),a(3),r("size",18),a(2),b(n.formResult?8:-1)}}function oe(l,d){if(l&1){let n=R();i(0,"div",4)(1,"app-doc-section",26)(2,"div",8)(3,"button",13),m("click",function(){h(n);let s=p();return y(s.openNonClosableDialog())}),c(4,"hk-lucide-icon",27),t(5," Non-closable (ESC/Backdrop disabled) "),e()()()()}if(l&2){let n=p();a(),r("codeExample",n.optionsCode),a(3),r("size",18)}}function ae(l,d){if(l&1&&(i(0,"div",4),c(1,"app-api-table",28),i(2,"div",29)(3,"div",30)(4,"h3",31),t(5,"Usage"),e(),i(6,"p",32),t(7," Inject "),i(8,"code"),t(9,"DialogService"),e(),t(10," and use "),i(11,"code"),t(12,"open()"),e(),t(13," to launch a modal dialog wrapped in a styled container, or "),i(14,"code"),t(15,"openRaw()"),e(),t(16," for a plain CDK dialog without the wrapper. Both return a "),i(17,"code"),t(18,"DialogRef"),e(),t(19," for controlling the dialog. "),e(),c(20,"app-code-block",33),e()(),i(21,"div",29)(22,"div",30)(23,"h3",31),t(24,"Behavior"),e(),i(25,"p",32),t(26," Important behavior details about dialog lifecycle, auto-close on navigation, and the wrapper component. "),e(),c(27,"app-code-block",33),e()()()),l&2){let n=p();a(),r("entries",n.methodDocs),a(19),r("code",n.usageCode),a(7),r("code",n.behaviorNotes)}}function le(l,d){if(l&1&&(i(0,"div",4),c(1,"app-api-table",34),i(2,"div",29)(3,"div",30)(4,"h3",31),t(5,"Dialog Component Pattern"),e(),i(6,"p",32),t(7," Dialog components receive data via the "),i(8,"code"),t(9,"DIALOG_DATA"),e(),t(10," injection token and control closing via "),i(11,"code"),t(12,"DialogRef"),e(),t(13,". Both are imported from "),i(14,"code"),t(15,"@angular/cdk/dialog"),e(),t(16,". "),e(),c(17,"app-code-block",33),e()()()),l&2){let n=p();a(),r("entries",n.configDocs),a(16),r("code",n.componentCode)}}function re(l,d){if(l&1&&(i(0,"div",4),c(1,"app-api-table",35),i(2,"div",29)(3,"div",30)(4,"h3",31),t(5,"Handling Dialog Results"),e(),i(6,"p",32),t(7," Subscribe to "),i(8,"code"),t(9,"closed"),e(),t(10," to receive the result value passed to "),i(11,"code"),t(12,"close(result)"),e(),t(13,". Use "),i(14,"code"),t(15,"outsideClicked"),e(),t(16," and "),i(17,"code"),t(18,"keydownEvents"),e(),t(19," for additional interaction handling. "),e(),c(20,"app-code-block",33),e()()()),l&2){let n=p();a(),r("entries",n.refDocs),a(19),r("code",n.refUsageCode)}}function se(l,d){if(l&1&&(i(0,"div",4)(1,"div",29)(2,"div",30)(3,"h3",31),t(4,"DialogConfig"),e(),i(5,"p",32),t(6," Configuration object passed as the second argument to "),i(7,"code"),t(8,"open()"),e(),t(9," or "),i(10,"code"),t(11,"openRaw()"),e(),t(12,". Extends CDK "),i(13,"code"),t(14,"DialogConfig"),e(),t(15," with a typed "),i(16,"code"),t(17,"data"),e(),t(18," property. "),e(),c(19,"app-code-block",33),e()(),i(20,"div",29)(21,"div",30)(22,"h3",31),t(23,"DialogRef"),e(),i(24,"p",32),t(25," Reference to an open dialog, returned by "),i(26,"code"),t(27,"open()"),e(),t(28," and "),i(29,"code"),t(30,"openRaw()"),e(),t(31,". Provides methods for closing and observables for monitoring dialog events. "),e(),c(32,"app-code-block",33),e()(),i(33,"div",29)(34,"div",30)(35,"h3",31),t(36,"DIALOG_DATA"),e(),i(37,"p",32),t(38,"CDK injection token used inside dialog components to access the data payload."),e(),c(39,"app-code-block",33),e()()()),l&2){let n=p();a(19),r("code",n.typeDialogConfig),a(13),r("code",n.typeDialogRef),a(7),r("code",n.typeDialogData)}}var A=class l{dialogRef=v(w);close(d){this.dialogRef.close(d)}static \u0275fac=function(n){return new(n||l)};static \u0275cmp=D({type:l,selectors:[["app-simple-dialog"]],decls:14,vars:1,consts:[[1,"card","bg-base-100","w-full"],[1,"card-body"],[1,"flex","justify-between","items-center"],[1,"card-title"],[1,"btn","btn-ghost","btn-sm","btn-circle",3,"click"],["name","X",3,"size"],[1,"text-base-content/70"],[1,"card-actions","justify-end","mt-4"],[1,"btn","btn-ghost",3,"click"],[1,"btn","btn-primary",3,"click"]],template:function(n,o){n&1&&(i(0,"div",0)(1,"div",1)(2,"div",2)(3,"h2",3),t(4,"Simple Dialog"),e(),i(5,"button",4),m("click",function(){return o.close()}),c(6,"hk-lucide-icon",5),e()(),i(7,"p",6),t(8,"This is a simple dialog with minimal content."),e(),i(9,"div",7)(10,"button",8),m("click",function(){return o.close()}),t(11,"Cancel"),e(),i(12,"button",9),m("click",function(){return o.close("confirmed")}),t(13,"Confirm"),e()()()()),n&2&&(a(6),r("size",18))},dependencies:[C],encapsulation:2})},z=class l{data=v(I);dialogRef=v(w);close(){this.dialogRef.close()}static \u0275fac=function(n){return new(n||l)};static \u0275cmp=D({type:l,selectors:[["app-data-dialog"]],decls:33,vars:6,consts:[[1,"card","bg-base-100","w-full"],[1,"card-body"],[1,"flex","justify-between","items-center"],[1,"card-title"],["name","User",3,"size"],[1,"btn","btn-ghost","btn-sm","btn-circle",3,"click"],["name","X",3,"size"],[1,"divider","my-2"],[1,"space-y-3"],[1,"flex","gap-2"],[1,"font-semibold","w-20"],[1,"badge","badge-primary"],[1,"card-actions","justify-end","mt-4"],[1,"btn","btn-primary",3,"click"]],template:function(n,o){n&1&&(i(0,"div",0)(1,"div",1)(2,"div",2)(3,"h2",3),c(4,"hk-lucide-icon",4),t(5," User Details "),e(),i(6,"button",5),m("click",function(){return o.close()}),c(7,"hk-lucide-icon",6),e()(),c(8,"div",7),i(9,"div",8)(10,"div",9)(11,"span",10),t(12,"ID:"),e(),i(13,"span"),t(14),e()(),i(15,"div",9)(16,"span",10),t(17,"Name:"),e(),i(18,"span"),t(19),e()(),i(20,"div",9)(21,"span",10),t(22,"Email:"),e(),i(23,"span"),t(24),e()(),i(25,"div",9)(26,"span",10),t(27,"Role:"),e(),i(28,"span",11),t(29),e()()(),i(30,"div",12)(31,"button",13),m("click",function(){return o.close()}),t(32,"Close"),e()()()()),n&2&&(a(4),r("size",24),a(3),r("size",18),a(7),_(o.data.id),a(5),_(o.data.name),a(5),_(o.data.email),a(5),_(o.data.role))},dependencies:[C],encapsulation:2})},j=class l{data=v(I);dialogRef=v(w);formData={name:this.data?.user?.name??"",email:this.data?.user?.email??"",role:this.data?.user?.role??"",country:this.data?.user?.country??""};roles=[{value:"admin",label:"Administrator"},{value:"editor",label:"Editor"},{value:"viewer",label:"Viewer"},{value:"moderator",label:"Moderator"},{value:"support",label:"Support Staff"}];countries=[{value:"us",label:"United States"},{value:"ca",label:"Canada"},{value:"mx",label:"Mexico"},{value:"uk",label:"United Kingdom"},{value:"de",label:"Germany"},{value:"fr",label:"France"},{value:"es",label:"Spain"},{value:"it",label:"Italy"},{value:"jp",label:"Japan"},{value:"cn",label:"China"},{value:"kr",label:"South Korea"},{value:"au",label:"Australia"},{value:"br",label:"Brazil"},{value:"ar",label:"Argentina"},{value:"in",label:"India"}];close(){this.dialogRef.close()}save(){this.dialogRef.close(this.formData)}static \u0275fac=function(n){return new(n||l)};static \u0275cmp=D({type:l,selectors:[["app-form-dialog"]],decls:36,vars:11,consts:[[1,"card","bg-base-100","w-full"],[1,"card-body"],[1,"flex","justify-between","items-center"],[1,"card-title"],["name","UserPlus",3,"size"],[1,"btn","btn-ghost","btn-sm","btn-circle",3,"click"],["name","X",3,"size"],[1,"divider","my-2"],[1,"space-y-4"],[1,"form-control"],[1,"label"],[1,"label-text"],["type","text","placeholder","Enter name","name","name",1,"input","input-bordered","w-full",3,"ngModelChange","ngModel"],["type","email","placeholder","Enter email","name","email",1,"input","input-bordered","w-full",3,"ngModelChange","ngModel"],["name","role","placeholder","Select role",3,"ngModelChange","options","ngModel"],["name","country","placeholder","Select country",3,"ngModelChange","options","ngModel","enableSearch"],[1,"card-actions","justify-end","mt-4"],[1,"btn","btn-ghost",3,"click"],[1,"btn","btn-primary",3,"click"],["name","Save",3,"size"]],template:function(n,o){n&1&&(i(0,"div",0)(1,"div",1)(2,"div",2)(3,"h2",3),c(4,"hk-lucide-icon",4),t(5),e(),i(6,"button",5),m("click",function(){return o.close()}),c(7,"hk-lucide-icon",6),e()(),c(8,"div",7),i(9,"form",8)(10,"div",9)(11,"label",10)(12,"span",11),t(13,"Name"),e()(),i(14,"input",12),E("ngModelChange",function(u){return k(o.formData.name,u)||(o.formData.name=u),u}),e()(),i(15,"div",9)(16,"label",10)(17,"span",11),t(18,"Email"),e()(),i(19,"input",13),E("ngModelChange",function(u){return k(o.formData.email,u)||(o.formData.email=u),u}),e()(),i(20,"div",9)(21,"label",10)(22,"span",11),t(23,"Role"),e()(),i(24,"hk-select",14),E("ngModelChange",function(u){return k(o.formData.role,u)||(o.formData.role=u),u}),e()(),i(25,"div",9)(26,"label",10)(27,"span",11),t(28,"Country"),e()(),i(29,"hk-select",15),E("ngModelChange",function(u){return k(o.formData.country,u)||(o.formData.country=u),u}),e()()(),i(30,"div",16)(31,"button",17),m("click",function(){return o.close()}),t(32,"Cancel"),e(),i(33,"button",18),m("click",function(){return o.save()}),c(34,"hk-lucide-icon",19),t(35," Save "),e()()()()),n&2&&(a(4),r("size",24),a(),S(" ",(o.data==null?null:o.data.mode)==="edit"?"Edit User":"Create User"," "),a(2),r("size",18),a(7),x("ngModel",o.formData.name),a(5),x("ngModel",o.formData.email),a(5),r("options",o.roles),x("ngModel",o.formData.role),a(5),r("options",o.countries),x("ngModel",o.formData.country),r("enableSearch",!0),a(5),r("size",18))},dependencies:[C,K,G,N,W,B,V,U,H],encapsulation:2})},O=class l{dialogRef=v(w);close(d){this.dialogRef.close(d)}static \u0275fac=function(n){return new(n||l)};static \u0275cmp=D({type:l,selectors:[["app-long-content-dialog"]],decls:48,vars:3,consts:[[1,"card","bg-base-100","w-full"],[1,"card-body"],[1,"flex","justify-between","items-center"],[1,"card-title"],["name","FileText",3,"size"],[1,"btn","btn-ghost","btn-sm","btn-circle",3,"click"],["name","X",3,"size"],[1,"divider","my-2"],[1,"prose","prose-sm","max-w-none","max-h-[60vh]","overflow-y-auto"],[1,"card-actions","justify-end","mt-4"],[1,"btn","btn-ghost",3,"click"],[1,"btn","btn-primary",3,"click"],["name","Check",3,"size"]],template:function(n,o){n&1&&(i(0,"div",0)(1,"div",1)(2,"div",2)(3,"h2",3),c(4,"hk-lucide-icon",4),t(5," Terms of Service "),e(),i(6,"button",5),m("click",function(){return o.close()}),c(7,"hk-lucide-icon",6),e()(),c(8,"div",7),i(9,"div",8)(10,"h3"),t(11,"1. Acceptance of Terms"),e(),i(12,"p"),t(13," By accessing and using this service, you accept and agree to be bound by the terms and provision of this agreement. Additionally, when using this service's particular services, you shall be subject to any posted guidelines or rules applicable to such services. "),e(),i(14,"h3"),t(15,"2. Description of Service"),e(),i(16,"p"),t(17," The Service provides users with access to a rich collection of resources, including various communications tools, forums, shopping services, personalized content, and branded programming through its network of properties. "),e(),i(18,"h3"),t(19,"3. Registration Obligations"),e(),i(20,"p"),t(21," In consideration of your use of the Service, you agree to: (a) provide true, accurate, current, and complete information about yourself as prompted by the Service's registration form and (b) maintain and promptly update the Registration Data to keep it true, accurate, current, and complete. "),e(),i(22,"h3"),t(23,"4. User Account, Password, and Security"),e(),i(24,"p"),t(25," You will receive a password and account designation upon completing the Service's registration process. You are responsible for maintaining the confidentiality of the password and account and are fully responsible for all activities that occur under your password or account. "),e(),i(26,"h3"),t(27,"5. User Conduct"),e(),i(28,"p"),t(29," You understand that all information, data, text, software, music, sound, photographs, graphics, video, messages, tags, or other materials, whether publicly posted or privately transmitted, are the sole responsibility of the person from whom such Content originated. "),e(),i(30,"h3"),t(31,"6. Content Submitted"),e(),i(32,"p"),t(33," The Service does not claim ownership of Content you submit or make available for inclusion on the Service. However, with respect to Content you submit or make available for inclusion on publicly accessible areas of the Service, you grant the following worldwide, royalty-free, and non-exclusive license(s). "),e(),i(34,"h3"),t(35,"7. Indemnity"),e(),i(36,"p"),t(37," You agree to indemnify and hold the Service and its subsidiaries, affiliates, officers, agents, employees, partners, and licensors harmless from any claim or demand, including reasonable attorneys' fees, made by any third party due to or arising out of Content you submit, post, transmit, or otherwise make available through the Service. "),e(),i(38,"h3"),t(39,"8. Modifications to Service"),e(),i(40,"p"),t(41," The Service reserves the right at any time and from time to time to modify or discontinue, temporarily or permanently, the Service (or any part thereof) with or without notice. You agree that the Service shall not be liable to you or to any third party for any modification, suspension, or discontinuance of the Service. "),e()(),i(42,"div",9)(43,"button",10),m("click",function(){return o.close()}),t(44,"Decline"),e(),i(45,"button",11),m("click",function(){return o.close("accepted")}),c(46,"hk-lucide-icon",12),t(47," Accept "),e()()()()),n&2&&(a(4),r("size",24),a(3),r("size",18),a(39),r("size",18))},dependencies:[C],encapsulation:2})},Z=class l{dialogService=v(Y);activeTab=M("basic");apiTab=M("service");simpleResult=null;formResult=null;termsResult=null;openSimpleDialog(){this.dialogService.open(A).closed.pipe(T(0)).subscribe(n=>{this.simpleResult=n?String(n):"cancelled"})}openDataDialog(){this.dialogService.open(z,{data:{id:42,name:"John Doe",email:"john.doe@example.com",role:"Administrator"}})}openFormDialog(d){this.dialogService.open(j,{data:{mode:d,user:d==="edit"?{name:"Jane Smith",email:"jane@example.com",role:"editor",country:"us"}:void 0,height:"90vh"}}).closed.pipe(T(0)).subscribe(o=>{o&&(this.formResult=o)})}openLongContentDialog(){this.dialogService.open(O).closed.pipe(T(0)).subscribe(n=>{this.termsResult=n?String(n):"declined"})}openNonClosableDialog(){this.dialogService.open(A,{disableClose:!0})}basicCode=`const ref = this.dialogService.open(SimpleDialogComponent);
ref.closed.subscribe(result => {
  console.log('Dialog closed:', result);
});`;dataCode=`this.dialogService.open(DataDialogComponent, {
  data: {
    id: 42,
    name: 'John Doe',
    email: 'john@example.com',
    role: 'Administrator',
  },
});`;formCode=`const ref = this.dialogService.open(FormDialogComponent, {
  data: { mode: 'create' },
});
ref.closed.subscribe(result => {
  if (result) console.log('Saved:', result);
});`;optionsCode=`this.dialogService.open(MyComponent, {
  disableClose: true,  // Disable ESC and backdrop close
});`;usageCode=`import { DialogService } from '@hakistack/ng-daisyui';

private dialogService = inject(DialogService);

// Open a dialog
const ref = this.dialogService.open(MyDialogComponent, {
  data: { key: 'value' },     // Passed via DIALOG_DATA
  disableClose: false,         // Allow ESC/backdrop close
});

// Handle result
ref.closed.subscribe(result => {
  console.log('Dialog result:', result);
});`;componentCode=`import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';

@Component({
  template: \`
    <div class="card bg-base-100">
      <div class="card-body">
        <h2 class="card-title">{{ data.title }}</h2>
        <p>{{ data.message }}</p>
        <div class="card-actions justify-end">
          <button class="btn btn-ghost" (click)="close()">Cancel</button>
          <button class="btn btn-primary" (click)="close('ok')">OK</button>
        </div>
      </div>
    </div>
  \`,
})
export class MyDialogComponent {
  data = inject(DIALOG_DATA);
  private dialogRef = inject(DialogRef);

  close(result?: string) {
    this.dialogRef.close(result);
  }
}`;behaviorNotes=`// Auto-close on navigation
// All open dialogs are automatically closed when the
// Angular router navigates to a new route.

// DialogWrapper
// The open() method wraps your component inside a
// DialogWrapperComponent that provides consistent modal
// styling (modal-box, responsive sizing, backdrop).
// Your inner component receives DIALOG_DATA and DialogRef
// via standard CDK injection.

// Raw dialogs
// Use openRaw() to render your component directly
// without the wrapper (for custom styling).`;methodDocs=[{name:"open(component, options?)",type:"DialogRef<DialogWrapperComponent>",description:"Open a wrapped dialog that hosts your component inside a styled modal-box"},{name:"openRaw(component, options?)",type:"DialogRef<T>",description:"Open a plain CDK dialog without the modal wrapper (for custom layouts)"}];configDocs=[{name:"data",type:"D",default:"-",description:"Payload injected into the dialog component via DIALOG_DATA token"},{name:"disableClose",type:"boolean",default:"false",description:"Disable closing via ESC key and backdrop click"},{name:"width",type:"string",default:"-",description:"Dialog width (CSS value, e.g. '500px', '80vw')"},{name:"height",type:"string",default:"-",description:"Dialog height (CSS value, e.g. '90vh')"},{name:"minWidth",type:"string | number",default:"-",description:"Minimum dialog width"},{name:"minHeight",type:"string | number",default:"-",description:"Minimum dialog height"},{name:"maxWidth",type:"string | number",default:"-",description:"Maximum dialog width"},{name:"maxHeight",type:"string | number",default:"-",description:"Maximum dialog height"},{name:"panelClass",type:"string | string[]",default:"-",description:"CSS class(es) applied to the overlay panel element"},{name:"hasBackdrop",type:"boolean",default:"true",description:"Whether to show a backdrop behind the dialog"},{name:"backdropClass",type:"string | string[]",default:"-",description:"CSS class(es) applied to the backdrop element"},{name:"ariaLabel",type:"string",default:"-",description:"Aria label for the dialog element"},{name:"ariaLabelledBy",type:"string",default:"-",description:"ID of element that labels the dialog"},{name:"ariaDescribedBy",type:"string",default:"-",description:"ID of element that describes the dialog"},{name:"autoFocus",type:"boolean | string | 'first-tabbable' | 'first-heading'",default:"'first-tabbable'",description:"Where to focus on open"},{name:"restoreFocus",type:"boolean",default:"true",description:"Whether to restore focus to the trigger element on close"}];refDocs=[{name:"close(result?)",type:"void",description:"Close the dialog, optionally passing a result value"},{name:"closed",type:"Observable<R | undefined>",description:"Observable that emits the result when the dialog closes"},{name:"outsideClicked",type:"Observable<MouseEvent>",description:"Observable that emits when clicking outside the dialog"},{name:"keydownEvents",type:"Observable<KeyboardEvent>",description:"Observable of all keydown events on the overlay"},{name:"componentInstance",type:"T | null",description:"Reference to the component instance rendered inside the dialog"},{name:"disableClose",type:"boolean",description:"Whether the dialog cannot be closed by user interaction (readable/writable)"}];refUsageCode=`const ref = this.dialogService.open(MyDialogComponent, {
  data: { id: 42 },
});

// Handle result when dialog closes
ref.closed.subscribe(result => {
  if (result) {
    console.log('Dialog returned:', result);
  }
});

// Listen for outside clicks (when disableClose is false)
ref.outsideClicked.subscribe(() => {
  console.log('User clicked outside the dialog');
});

// Listen for keydown events on the overlay
ref.keydownEvents.subscribe(event => {
  if (event.key === 'Escape') {
    console.log('Escape pressed');
  }
});

// Access the component instance
const instance = ref.componentInstance;

// Programmatically prevent close
ref.disableClose = true;`;typeDialogConfig=`interface DialogConfig<D = unknown> {
  /** Payload injected via DIALOG_DATA token */
  data?: D;

  /** Disable closing via ESC key and backdrop click (default: false) */
  disableClose?: boolean;

  /** Dialog width (CSS value, e.g. '500px', '80vw') */
  width?: string;

  /** Dialog height (CSS value, e.g. '90vh') */
  height?: string;

  /** Minimum dialog width */
  minWidth?: string | number;

  /** Minimum dialog height */
  minHeight?: string | number;

  /** Maximum dialog width */
  maxWidth?: string | number;

  /** Maximum dialog height */
  maxHeight?: string | number;

  /** CSS class(es) for the overlay panel */
  panelClass?: string | string[];

  /** Show backdrop behind dialog (default: true) */
  hasBackdrop?: boolean;

  /** CSS class(es) for the backdrop */
  backdropClass?: string | string[];

  /** ARIA label for the dialog */
  ariaLabel?: string;

  /** ID of element that labels the dialog */
  ariaLabelledBy?: string;

  /** ID of element that describes the dialog */
  ariaDescribedBy?: string;

  /** Where to focus on open (default: 'first-tabbable') */
  autoFocus?: boolean | string | 'first-tabbable' | 'first-heading';

  /** Restore focus to trigger element on close (default: true) */
  restoreFocus?: boolean;
}`;typeDialogRef=`interface DialogRef<T = unknown, R = unknown> {
  /** Close the dialog with an optional result value */
  close(result?: R): void;

  /** Observable that emits the result when dialog closes */
  closed: Observable<R | undefined>;

  /** Observable for clicks outside the dialog */
  outsideClicked: Observable<MouseEvent>;

  /** Observable for keydown events on the overlay */
  keydownEvents: Observable<KeyboardEvent>;

  /** Reference to the rendered component instance */
  componentInstance: T | null;

  /** Whether user interaction can close the dialog */
  disableClose: boolean;
}`;typeDialogData=`import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';

@Component({ ... })
export class MyDialogComponent {
  // Inject the data payload passed via config.data
  data = inject(DIALOG_DATA) as { id: number; name: string };

  // Inject DialogRef to close the dialog
  private dialogRef = inject(DialogRef);

  close(result?: string) {
    this.dialogRef.close(result);
  }
}`;static \u0275fac=function(n){return new(n||l)};static \u0275cmp=D({type:l,selectors:[["app-dialog-demo"]],decls:26,vars:21,consts:[["title","Dialog Service","description","Programmatic dialogs with component injection and data passing","icon","PanelTopOpen","category","Feedback","importName","DialogService"],["examples",""],["role","tablist",1,"tabs","tabs-box","tabs-boxed"],["role","tab",1,"tab",3,"click"],[1,"space-y-6"],["title","Form Dialog","description","Dialog with form inputs and selects (test responsiveness)",3,"codeExample"],["api",""],["title","Basic Dialog","description","Simple dialog with confirm/cancel buttons",3,"codeExample"],[1,"flex","flex-wrap","gap-3"],[1,"btn","btn-primary",3,"click"],["name","Square",3,"size"],[1,"alert","alert-info","mt-4"],["title","Dialog with Data","description","Pass data to dialog component via DIALOG_DATA",3,"codeExample"],[1,"btn","btn-outline",3,"click"],["name","User",3,"size"],["title","Long Content Dialog","description","Dialog with scrollable content"],["name","FileText",3,"size"],[1,"alert","mt-4",3,"alert-success","alert-warning"],["name","Info",3,"size"],[1,"alert","mt-4"],[3,"name","size"],[1,"btn","btn-outline","btn-success",3,"click"],["name","UserPlus",3,"size"],["name","Pencil",3,"size"],[1,"alert","alert-success","mt-4"],["name","Check",3,"size"],["title","Dialog Options","description","Control dialog behavior",3,"codeExample"],["name","Lock",3,"size"],["title","DialogService Methods",3,"entries"],[1,"card","card-border","card-bordered","bg-base-100"],[1,"card-body","gap-3"],[1,"card-title","text-lg"],[1,"text-sm","text-base-content/70"],[3,"code"],["title","DialogConfig Options (CDK)",3,"entries"],["title","DialogRef Properties & Methods",3,"entries"]],template:function(n,o){n&1&&(i(0,"app-demo-page",0)(1,"div",1)(2,"div",2)(3,"button",3),m("click",function(){return o.activeTab.set("basic")}),t(4,"Basic"),e(),i(5,"button",3),m("click",function(){return o.activeTab.set("forms")}),t(6,"Forms"),e(),i(7,"button",3),m("click",function(){return o.activeTab.set("options")}),t(8,"Options"),e()(),g(9,te,18,7,"div",4),g(10,ne,9,4,"app-doc-section",5),g(11,oe,6,2,"div",4),e(),i(12,"div",6)(13,"div",2)(14,"button",3),m("click",function(){return o.apiTab.set("service")}),t(15,"Service"),e(),i(16,"button",3),m("click",function(){return o.apiTab.set("config")}),t(17,"DialogConfig"),e(),i(18,"button",3),m("click",function(){return o.apiTab.set("ref")}),t(19,"DialogRef"),e(),i(20,"button",3),m("click",function(){return o.apiTab.set("types")}),t(21,"Types"),e()(),g(22,ae,28,3,"div",4),g(23,le,18,2,"div",4),g(24,re,21,2,"div",4),g(25,se,40,3,"div",4),e()()),n&2&&(a(3),f("tab-active",o.activeTab()==="basic"),a(2),f("tab-active",o.activeTab()==="forms"),a(2),f("tab-active",o.activeTab()==="options"),a(2),b(o.activeTab()==="basic"?9:-1),a(),b(o.activeTab()==="forms"?10:-1),a(),b(o.activeTab()==="options"?11:-1),a(3),f("tab-active",o.apiTab()==="service"),a(2),f("tab-active",o.apiTab()==="config"),a(2),f("tab-active",o.apiTab()==="ref"),a(2),f("tab-active",o.apiTab()==="types"),a(2),b(o.apiTab()==="service"?22:-1),a(),b(o.apiTab()==="config"?23:-1),a(),b(o.apiTab()==="ref"?24:-1),a(),b(o.apiTab()==="types"?25:-1))},dependencies:[C,X,q,J,Q,F],encapsulation:2})};export{z as DataDialogComponent,Z as DialogDemoComponent,j as FormDialogComponent,O as LongContentDialogComponent,A as SimpleDialogComponent};
