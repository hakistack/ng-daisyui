import{a as L}from"./chunk-7NFJGNQ6.js";import{a as D,b as I,c as P}from"./chunk-LF3XQDBE.js";import{C as T,E as m,G as s,Hc as k,L as E,M as h,N as v,O as a,P as p,Q as V,R as z,d as b,e as _,ea as f,i as g,l as i,n as w,o as S,q as x,r as y,v as d,w as l,x as o,y as C}from"./chunk-XEMU7XGV.js";import"./chunk-DAQOROHW.js";function F(t,r){if(t&1&&(l(0,"div",23)(1,"div")(2,"div",24),a(3),o(),l(4,"div",25),a(5),o()(),l(6,"div",26),a(7),o()()),t&2){let e=r.$implicit,n=r.odd;h("height",60,"px"),v("bg-base-200",n),i(3),p(e.name),i(2),p(e.category),i(2),p("$"+e.price.toFixed(2))}}function R(t,r){if(t&1&&(l(0,"div",20),a(1),o()),t&2){let e=r;i(),z("Visible: items ",e.first," - ",e.last)}}function $(t,r){if(t&1&&(l(0,"div",27),a(1),o()),t&2){let e=s(2);i(),V(" Product List (",e.largeList().length," items) ")}}function A(t,r){if(t&1&&(l(0,"div",28)(1,"span",29),a(2),o(),l(3,"span"),a(4),o()()),t&2){let e=r.$implicit,n=r.index;h("height",48,"px"),i(2),p(n+1),i(2),p(e.name)}}function N(t,r){t&1&&(l(0,"div",30),a(1,"End of list"),o())}function B(t,r){if(t&1){let e=T();l(0,"div",9)(1,"app-doc-section",14)(2,"hk-virtual-scroller",15,0),m("scrolled",function(c){b(e);let u=s();return _(u.lastScrollEvent.set(c))}),S(4,F,8,7,"ng-template",null,1,f),o(),l(6,"div",16)(7,"button",17),m("click",function(){b(e);let c=E(3);return _(c.scrollToIndex(0,"smooth"))}),a(8,"Scroll to Top"),o(),l(9,"button",18),m("click",function(){b(e);let c=E(3);return _(c.scrollToIndex(5e3,"smooth"))}),a(10,"Scroll to #5000"),o(),l(11,"button",19),m("click",function(){b(e);let c=E(3);return _(c.scrollToIndex(9999,"smooth"))}),a(12,"Scroll to Bottom"),o()(),x(13,R,2,2,"div",20),o(),l(14,"app-doc-section",21)(15,"hk-virtual-scroller",22),S(16,$,2,1,"ng-template",null,2,f)(18,A,5,4,"ng-template",null,1,f)(20,N,2,0,"ng-template",null,3,f),o()()()}if(t&2){let e,n=s();i(),d("codeExample",n.basicCode),i(),d("items",n.largeList())("itemSize",60),i(11),y((e=n.lastScrollEvent())?13:-1,e),i(),d("codeExample",n.headerFooterCode),i(),d("items",n.largeList())("itemSize",48)}}function O(t,r){if(t&1&&(l(0,"div",33)(1,"div",34)(2,"h3",35),a(3),o(),l(4,"p",36),a(5),o(),l(6,"div",37),a(7),o()()()),t&2){let e=r.$implicit;h("width",184,"px")("height",160,"px"),i(3),p(e.name),i(2),p(e.category),i(2),p("$"+e.price.toFixed(2))}}function q(t,r){if(t&1&&(l(0,"div",10)(1,"app-doc-section",31)(2,"hk-virtual-scroller",32),S(3,O,8,7,"ng-template",null,1,f),o()()()),t&2){let e=s();i(),d("codeExample",e.horizontalCode),i(),d("items",e.largeList())("itemSize",200)}}function G(t,r){if(t&1&&(l(0,"div",42)(1,"div",43)(2,"div",44),a(3),o(),l(4,"h3",45),a(5),o(),l(6,"p",36),a(7),o(),l(8,"div",46),a(9),o()()()),t&2){let e=r.$implicit,n=r.index;i(3),V("#",n+1),i(2),p(e.name),i(2),p(e.category),i(2),p("$"+e.price.toFixed(2))}}function U(t,r){if(t&1){let e=T();l(0,"div",10)(1,"app-doc-section",38)(2,"div",39)(3,"button",40),m("click",function(){b(e);let c=s();return _(c.gridCols.set(2))}),a(4,"2 Columns"),o(),l(5,"button",40),m("click",function(){b(e);let c=s();return _(c.gridCols.set(3))}),a(6,"3 Columns"),o(),l(7,"button",40),m("click",function(){b(e);let c=s();return _(c.gridCols.set(4))}),a(8,"4 Columns"),o()(),l(9,"hk-virtual-scroller",41),S(10,G,10,4,"ng-template",null,1,f),o()()()}if(t&2){let e=s();i(),d("codeExample",e.gridCode),i(2),v("btn-primary",e.gridCols()===2),i(2),v("btn-primary",e.gridCols()===3),i(2),v("btn-primary",e.gridCols()===4),i(2),d("items",e.gridList())("itemSize",140)("numColumns",e.gridCols())}}function W(t,r){if(t&1&&(l(0,"div",23)(1,"div")(2,"div",24),a(3),o(),l(4,"div",25),a(5),o()(),l(6,"div",26),a(7),o()()),t&2){let e=r.$implicit;h("height",60,"px"),i(3),p(e.name),i(2),p(e.category),i(2),p("$"+e.price.toFixed(2))}}function j(t,r){t&1&&(l(0,"div",28),C(1,"div",51)(2,"div",52),o()),t&2&&h("height",60,"px")}function J(t,r){if(t&1){let e=T();l(0,"div",10)(1,"app-doc-section",47)(2,"div",48)(3,"span",25),a(4),o(),l(5,"button",49),m("click",function(){b(e);let c=s();return _(c.resetLazy())}),a(6,"Reset"),o()(),l(7,"hk-virtual-scroller",50),m("lazyLoad",function(c){b(e);let u=s();return _(u.onLazyLoad(c))}),S(8,W,8,5,"ng-template",null,1,f)(10,j,3,2,"ng-template",null,4,f),o()()()}if(t&2){let e=s();i(),d("codeExample",e.lazyCode),i(3),z(" Loaded: ",e.loadedCount()," / ",e.totalLazyItems," items "),i(3),d("items",e.lazyItems())("itemSize",60)("lazy",!0)}}function K(t,r){if(t&1&&(l(0,"div",10),C(1,"app-api-table",53)(2,"app-api-table",54),o()),t&2){let e=s();i(),d("entries",e.inputDocs),i(),d("entries",e.methodDocs)}}function Q(t,r){if(t&1&&C(0,"app-api-table",12),t&2){let e=s();d("entries",e.outputDocs)}}function X(t,r){if(t&1&&(l(0,"div",10),C(1,"app-api-table",55),l(2,"div",13)(3,"div",56)(4,"h3",57),a(5,"Template Context"),o(),C(6,"app-code-block",58),o()()()),t&2){let e=s();i(),d("entries",e.templateDocs),i(5),d("code",e.templateContextCode)}}function Y(t,r){if(t&1&&(l(0,"div",13)(1,"div",56)(2,"h3",57),a(3,"Type Definitions"),o(),C(4,"app-code-block",58),o()()),t&2){let e=s();i(4),d("code",e.typesCode)}}function H(t){let r=["Electronics","Clothing","Books","Home","Sports"];return Array.from({length:t},(e,n)=>({id:n,name:`Product ${n+1}`,price:Math.round(Math.random()*500*100)/100,category:r[n%r.length]}))}var M=class t{activeTab=g("basic");apiTab=g("component");gridCols=g(3);lastScrollEvent=g(null);largeList=g(H(1e4));gridList=g(H(600));totalLazyItems=5e3;lazyItems=g(new Array(this.totalLazyItems).fill(null));loadedCount=g(0);onLazyLoad(r){setTimeout(()=>{let e=[...this.lazyItems()],n=["Electronics","Clothing","Books","Home","Sports"],c=0;for(let u=r.first;u<r.first+r.rows&&u<e.length;u++)e[u]==null&&(e[u]={id:u,name:`Product ${u+1}`,price:Math.round(Math.random()*500*100)/100,category:n[u%n.length]},c++);this.lazyItems.set(e),this.loadedCount.update(u=>u+c)},300)}resetLazy(){this.lazyItems.set(new Array(this.totalLazyItems).fill(null)),this.loadedCount.set(0)}basicCode=`<hk-virtual-scroller
  [items]="products()"
  [itemSize]="60"
  viewportHeight="350px"
  (scrolled)="onScroll($event)"
>
  <ng-template #item let-product let-i="index" let-isOdd="odd">
    <div class="flex items-center px-4" [style.height.px]="60">
      {{ product.name }} - {{ product.price }}
    </div>
  </ng-template>
</hk-virtual-scroller>

<!-- Programmatic scroll -->
<button (click)="scroller.scrollToIndex(500, 'smooth')">
  Go to #500
</button>`;headerFooterCode=`<hk-virtual-scroller [items]="items()" [itemSize]="48" viewportHeight="280px">
  <ng-template #header>
    <div class="p-3 bg-primary text-primary-content">Header</div>
  </ng-template>
  <ng-template #item let-product let-i="index">
    <div [style.height.px]="48">{{ product.name }}</div>
  </ng-template>
  <ng-template #footer>
    <div class="p-3 bg-base-200">Footer</div>
  </ng-template>
</hk-virtual-scroller>`;horizontalCode=`<hk-virtual-scroller
  [items]="products()"
  [itemSize]="200"
  orientation="horizontal"
  viewportHeight="180px"
>
  <ng-template #item let-product>
    <div class="card m-2" [style.width.px]="184">
      {{ product.name }}
    </div>
  </ng-template>
</hk-virtual-scroller>`;gridCode=`<hk-virtual-scroller
  [items]="products()"
  [itemSize]="140"
  [numColumns]="3"
  viewportHeight="420px"
>
  <ng-template #item let-product let-i="index">
    <div class="card m-1 h-[130px]">
      <div class="card-body p-3">
        {{ product.name }} - {{ product.price }}
      </div>
    </div>
  </ng-template>
</hk-virtual-scroller>`;lazyCode=`// Component
totalItems = 5000;
lazyItems = signal<(Product | null)[]>(new Array(5000).fill(null));

onLazyLoad(event: VirtualScrollerLazyLoadEvent) {
  fetchProducts(event.first, event.rows).then(products => {
    const items = [...this.lazyItems()];
    products.forEach((p, i) => items[event.first + i] = p);
    this.lazyItems.set(items);
  });
}

// Template
<hk-virtual-scroller
  [items]="lazyItems()"
  [itemSize]="60"
  [lazy]="true"
  viewportHeight="360px"
  (lazyLoad)="onLazyLoad($event)"
>
  <ng-template #item let-product>
    <div>{{ product.name }}</div>
  </ng-template>
  <ng-template #loader>
    <div class="skeleton h-4 w-40"></div>
  </ng-template>
</hk-virtual-scroller>`;templateContextCode=`// Item template context (VirtualScrollerItemContext<T>)
interface VirtualScrollerItemContext<T> {
  $implicit: T;    // The item (use let-data)
  index: number;   // Item index
  count: number;   // Total items
  first: boolean;  // Is first item
  last: boolean;   // Is last item
  even: boolean;   // Even index
  odd: boolean;    // Odd index
}

// Usage:
<ng-template #item let-product let-i="index" let-isFirst="first" let-isOdd="odd">
  <div [class.bg-base-200]="isOdd">
    #{{ i }} - {{ product.name }}
  </div>
</ng-template>`;typesCode=`type VirtualScrollerOrientation = 'vertical' | 'horizontal' | 'both';
type VirtualScrollBehavior = 'auto' | 'smooth';

interface VirtualScrollerLazyLoadEvent {
  first: number;  // First index of requested range
  rows: number;   // Number of items to load
}

interface VirtualScrollerScrollEvent {
  first: number;  // First visible index
  last: number;   // Last visible index
}

interface VirtualScrollerItemContext<T> {
  $implicit: T;
  index: number;
  count: number;
  first: boolean;
  last: boolean;
  even: boolean;
  odd: boolean;
}

interface VirtualScrollerLoaderContext {
  index: number;
}`;inputDocs=[{name:"items",type:"readonly (T | null)[]",default:"[]",description:"Array of items to display. Use null entries for unloaded items in lazy mode."},{name:"itemSize",type:"number",description:"Height (vertical) or width (horizontal) of each item in pixels. Required."},{name:"orientation",type:"VirtualScrollerOrientation",default:"'vertical'",description:"Scroll direction: 'vertical', 'horizontal', or 'both' (grid)."},{name:"numColumns",type:"number",default:"1",description:"Number of columns in grid mode. Values > 1 activate grid layout."},{name:"viewportHeight",type:"string",default:"'400px'",description:"CSS height of the scroll viewport."},{name:"viewportWidth",type:"string",default:"'100%'",description:"CSS width of the scroll viewport."},{name:"scrollDelay",type:"number",default:"0",description:"Debounce delay in milliseconds for scroll events."},{name:"minBufferPx",type:"number",default:"100",description:"Minimum pixels of content to render beyond the viewport."},{name:"maxBufferPx",type:"number",default:"200",description:"Maximum pixels of content to render beyond the viewport."},{name:"trackByFn",type:"TrackByFunction<T>",default:"-",description:"Custom trackBy function for cdkVirtualFor rendering optimization."},{name:"lazy",type:"boolean",default:"false",description:"Enable lazy loading mode. Emits lazyLoad events for null items in view."},{name:"loading",type:"boolean",default:"false",description:"Show a loading spinner below the viewport."},{name:"containerClass",type:"string",default:"''",description:"Additional CSS class applied to the viewport element."},{name:"itemClass",type:"string",default:"''",description:"Additional CSS class applied to each item wrapper."}];outputDocs=[{name:"scrolled",type:"VirtualScrollerScrollEvent",description:"Emits first and last visible indices on scroll (respects scrollDelay)."},{name:"lazyLoad",type:"VirtualScrollerLazyLoadEvent",description:"Emits when unloaded items (null) enter the viewport. Contains first index and rows count."},{name:"scrollIndexChange",type:"number",description:"Emits the first visible item index on each scroll event."}];methodDocs=[{name:"scrollToIndex(index, behavior?)",type:"void",description:"Programmatically scroll to a specific item index. Behavior: 'auto' (default) or 'smooth'."}];templateDocs=[{name:"#item",type:"TemplateRef<VirtualScrollerItemContext<T>>",description:"Required. Template for rendering each item. Context provides $implicit (item), index, count, first, last, even, odd."},{name:"#loader",type:"TemplateRef<VirtualScrollerLoaderContext>",description:"Optional. Template for unloaded items (null entries) in lazy mode. Falls back to a DaisyUI skeleton."},{name:"#header",type:"TemplateRef<unknown>",description:"Optional. Content rendered above the scroll viewport."},{name:"#footer",type:"TemplateRef<unknown>",description:"Optional. Content rendered below the scroll viewport."}];static \u0275fac=function(e){return new(e||t)};static \u0275cmp=w({type:t,selectors:[["app-virtual-scroller-demo"]],decls:29,vars:24,consts:[["basicScroller",""],["item",""],["header",""],["footer",""],["loader",""],["title","Virtual Scroller","description","Performance-optimized scrolling for large datasets using virtual rendering","icon","ScrollText","category","Data Display","importName","VirtualScrollerComponent"],["examples",""],["role","tablist",1,"tabs","tabs-box","tabs-boxed"],["role","tab",1,"tab",3,"click"],[1,"grid","gap-6","lg:grid-cols-2"],[1,"space-y-6"],["api",""],["title","Outputs",3,"entries"],[1,"card","card-border","card-bordered","bg-base-100"],["title","Vertical Scrolling","description","Renders 10,000 items efficiently with fixed item height",3,"codeExample"],["viewportHeight","350px",3,"scrolled","items","itemSize"],[1,"mt-3","flex","flex-wrap","items-center","gap-2"],[1,"btn","btn-sm","btn-primary",3,"click"],[1,"btn","btn-sm","btn-secondary",3,"click"],[1,"btn","btn-sm","btn-accent",3,"click"],[1,"mt-2","text-xs","text-base-content/60"],["title","With Header & Footer","description","Optional header and footer templates outside the scroll viewport",3,"codeExample"],["viewportHeight","280px",3,"items","itemSize"],[1,"flex","items-center","justify-between","px-4","border-b","border-base-200"],[1,"font-medium"],[1,"text-sm","text-base-content/60"],[1,"badge","badge-ghost"],[1,"p-3","bg-primary","text-primary-content","font-semibold","rounded-t-lg"],[1,"flex","items-center","gap-3","px-4"],[1,"text-base-content/40","text-xs","w-8"],[1,"p-3","bg-base-200","text-sm","text-base-content/60","rounded-b-lg"],["title","Horizontal Scrolling","description","Scroll items horizontally with fixed width per item",3,"codeExample"],["orientation","horizontal","viewportHeight","180px","viewportWidth","100%",3,"items","itemSize"],[1,"card","bg-base-200","m-2"],[1,"card-body","p-4"],[1,"card-title","text-sm"],[1,"text-xs","text-base-content/60"],[1,"badge","badge-primary","mt-2"],["title","Grid Layout","description","Virtual grid with configurable columns. Each row is virtualized.",3,"codeExample"],[1,"flex","gap-2","mb-4"],[1,"btn","btn-sm",3,"click"],["viewportHeight","420px",3,"items","itemSize","numColumns"],[1,"card","bg-base-200","m-1","h-[130px]"],[1,"card-body","p-3"],[1,"text-xs","text-base-content/40"],[1,"font-medium","text-sm"],[1,"text-sm","font-semibold","text-primary"],["title","Lazy Loading","description","Load data on demand as the user scrolls. Pass a sparse array with null for unloaded items.",3,"codeExample"],[1,"mb-3","flex","items-center","gap-3"],[1,"btn","btn-sm","btn-ghost",3,"click"],["viewportHeight","360px",3,"lazyLoad","items","itemSize","lazy"],[1,"skeleton","h-4","w-40"],[1,"skeleton","h-4","w-16","ml-auto"],["title","Inputs",3,"entries"],["title","Methods",3,"entries"],["title","Template Slots",3,"entries"],[1,"card-body","gap-3"],[1,"card-title","text-lg"],[3,"code"]],template:function(e,n){e&1&&(l(0,"app-demo-page",5)(1,"div",6)(2,"div",7)(3,"button",8),m("click",function(){return n.activeTab.set("basic")}),a(4,"Basic"),o(),l(5,"button",8),m("click",function(){return n.activeTab.set("horizontal")}),a(6," Horizontal "),o(),l(7,"button",8),m("click",function(){return n.activeTab.set("grid")}),a(8,"Grid"),o(),l(9,"button",8),m("click",function(){return n.activeTab.set("lazy")}),a(10,"Lazy Loading"),o()(),x(11,B,22,7,"div",9),x(12,q,5,3,"div",10),x(13,U,12,10,"div",10),x(14,J,12,6,"div",10),o(),l(15,"div",11)(16,"div",7)(17,"button",8),m("click",function(){return n.apiTab.set("component")}),a(18,"Component"),o(),l(19,"button",8),m("click",function(){return n.apiTab.set("events")}),a(20,"Events"),o(),l(21,"button",8),m("click",function(){return n.apiTab.set("templates")}),a(22,"Templates"),o(),l(23,"button",8),m("click",function(){return n.apiTab.set("types")}),a(24,"Types"),o()(),x(25,K,3,2,"div",10),x(26,Q,1,1,"app-api-table",12),x(27,X,7,2,"div",10),x(28,Y,5,1,"div",13),o()()),e&2&&(i(3),v("tab-active",n.activeTab()==="basic"),i(2),v("tab-active",n.activeTab()==="horizontal"),i(2),v("tab-active",n.activeTab()==="grid"),i(2),v("tab-active",n.activeTab()==="lazy"),i(2),y(n.activeTab()==="basic"?11:-1),i(),y(n.activeTab()==="horizontal"?12:-1),i(),y(n.activeTab()==="grid"?13:-1),i(),y(n.activeTab()==="lazy"?14:-1),i(3),v("tab-active",n.apiTab()==="component"),i(2),v("tab-active",n.apiTab()==="events"),i(2),v("tab-active",n.apiTab()==="templates"),i(2),v("tab-active",n.apiTab()==="types"),i(2),y(n.apiTab()==="component"?25:-1),i(),y(n.apiTab()==="events"?26:-1),i(),y(n.apiTab()==="templates"?27:-1),i(),y(n.apiTab()==="types"?28:-1))},dependencies:[k,I,L,D,P],encapsulation:2})};export{M as VirtualScrollerDemoComponent};
