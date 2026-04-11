import{a as H}from"./chunk-7NFJGNQ6.js";import{a as K,b as L,c as j}from"./chunk-LF3XQDBE.js";import{Ac as G,C as T,E as u,G as c,N as y,O as r,P as k,Q as w,R as N,aa as D,c as P,ca as U,cc as z,d as h,da as _,e as v,ea as M,fa as x,i as C,ka as O,l as i,la as V,ma as q,n as F,o as E,q as g,qc as B,r as b,uc as f,v as s,vc as $,w as a,x as n,y as p}from"./chunk-XEMU7XGV.js";import{a as R,b as A}from"./chunk-DAQOROHW.js";function J(l,t){if(l&1){let e=T();a(0,"app-doc-section",5)(1,"hk-table",20),u("sortChange",function(d){h(e);let m=c();return v(m.onSort(d))}),n()()}if(l&2){let e=c();s("codeExample",e.basicCode),i(),s("data",e.users())("config",e.basicConfig)}}function X(l,t){if(l&1&&(a(0,"div",23),p(1,"hk-lucide-icon",24),a(2,"span"),r(3),n()()),l&2){let e=c(2);i(),s("size",20),i(2),w("",e.selectedUsers().length," user(s) selected")}}function Q(l,t){if(l&1){let e=T();a(0,"app-doc-section",21)(1,"hk-table",22),u("selectionChange",function(d){h(e);let m=c();return v(m.onSelection(d))})("sortChange",function(d){h(e);let m=c();return v(m.onSort(d))})("filterChange",function(d){h(e);let m=c();return v(m.onFilter(d))})("globalSearchChange",function(d){h(e);let m=c();return v(m.onSearch(d))})("pageChange",function(d){h(e);let m=c();return v(m.onPageChange(d))}),n()(),g(2,X,4,2,"div",23)}if(l&2){let e=c();s("codeExample",e.fullCode),i(),s("data",e.users())("config",e.fullConfig)("paginationOptions",e.paginationOptions),i(),b(e.selectedUsers().length>0?2:-1)}}function Y(l,t){if(l&1&&(a(0,"div",23),p(1,"hk-lucide-icon",29),a(2,"span"),r(3,"Active row: "),a(4,"strong"),r(5),n(),r(6),n()()),l&2){let e=c(2);i(),s("size",20),i(4),k(e.activeUser().name),i(),w(" (",e.activeUser().role,")")}}function Z(l,t){if(l&1&&(a(0,"div",23),p(1,"hk-lucide-icon",29),a(2,"span"),r(3),a(4,"strong"),r(5),n()()()),l&2){let e=c(2);i(),s("size",20),i(2),w("",e.activeUsers().length," row(s) selected: "),i(2),k(e.activeUserNames())}}function ee(l,t){if(l&1){let e=T();a(0,"app-doc-section",25)(1,"hk-table",26),u("activeRowChange",function(d){h(e);let m=c();return v(m.onActiveRowChange(d))}),n()(),g(2,Y,7,3,"div",23),a(3,"app-doc-section",27)(4,"hk-table",28),u("activeRowsChange",function(d){h(e);let m=c();return v(m.onActiveRowsChange(d))}),n()(),g(5,Z,6,3,"div",23)}if(l&2){let e=c();s("codeExample",e.selectableRowCode),i(),s("data",e.users())("config",e.selectableRowConfig),i(),b(e.activeUser()?2:-1),i(),s("codeExample",e.multiSelectableRowCode),i(),s("data",e.users())("config",e.multiSelectableRowConfig),i(),b(e.activeUsers().length>0?5:-1)}}function te(l,t){if(l&1&&(a(0,"app-doc-section",6)(1,"div",30),p(2,"hk-table",31),n()()),l&2){let e=c();s("codeExample",e.stickyCode),i(2),s("data",e.users())("config",e.stickyConfig)}}function ie(l,t){if(l&1){let e=T();a(0,"app-doc-section",7)(1,"hk-table",32),u("columnResize",function(d){h(e);let m=c();return v(m.onColumnResize(d))}),n()()}if(l&2){let e=c();s("codeExample",e.resizableCode),i(),s("data",e.users())("config",e.resizableConfig)}}function ne(l,t){if(l&1&&(a(0,"app-doc-section",8),p(1,"hk-table",31),n()),l&2){let e=c();s("codeExample",e.virtualScrollCode),i(),s("data",e.virtualScrollUsers())("config",e.virtualScrollConfig)}}function ae(l,t){if(l&1){let e=T();a(0,"app-doc-section",9)(1,"hk-table",33),u("cellEdit",function(d){h(e);let m=c();return v(m.onCellEdit(d))}),n()()}if(l&2){let e=c();s("codeExample",e.editableCode),i(),s("data",e.editableUsers())("config",e.editableConfig)}}function oe(l,t){if(l&1&&(a(0,"div",38)(1,"div",39),p(2,"hk-lucide-icon",40),a(3,"span"),r(4),n()(),a(5,"div",41)(6,"span",42),r(7),D(8,"currency"),n(),a(9,"span",43),r(10),D(11,"currency"),n()()()),l&2){let e=t.$implicit,o=c(2);i(4),N("",e.length," employees across ",o.uniqueDepartments(e).length," departments"),i(3),w("Total: ",_(8,4,o.salaryTotal(),"USD","symbol","1.0-0")),i(3),w("Avg: ",_(11,9,o.salaryAvg(),"USD","symbol","1.0-0"))}}function re(l,t){if(l&1&&(a(0,"app-doc-section",34),p(1,"hk-table",31),n(),a(2,"app-doc-section",35),p(3,"hk-table",31),n(),a(4,"app-doc-section",36)(5,"hk-table",31),E(6,oe,12,14,"ng-template",37),n()()),l&2){let e=c();s("codeExample",e.footerCode),i(),s("data",e.users())("config",e.footerConfig),i(),s("codeExample",e.colspanFooterCode),i(),s("data",e.users())("config",e.colspanFooterConfig),i(),s("codeExample",e.customFooterCode),i(),s("data",e.users())("config",e.customFooterConfig)}}function le(l,t){if(l&1&&(a(0,"div",45)(1,"div")(2,"h4",46),r(3,"Contact Information"),n(),a(4,"p",47),r(5),n(),a(6,"p",47),r(7),n()(),a(8,"div")(9,"h4",46),r(10,"Employment Details"),n(),a(11,"p",47),r(12),n(),a(13,"p",47),r(14),n(),a(15,"p",47),r(16),D(17,"number"),n()()()),l&2){let e=t.$implicit;i(5),w("Email: ",e.email),i(2),w("Department: ",e.department),i(5),w("Role: ",e.role),i(2),w("Status: ",e.status),i(2),w("Salary: ",U(17,5,e.salary,"1.0-0"))}}function se(l,t){if(l&1){let e=T();a(0,"app-doc-section",10)(1,"hk-table",44),u("detailExpansionChange",function(d){h(e);let m=c();return v(m.onDetailExpand(d))}),E(2,le,18,8,"ng-template",null,0,M),n()()}if(l&2){let e=c();s("codeExample",e.expandableCode),i(),s("data",e.users())("config",e.expandableConfig)}}function de(l,t){if(l&1){let e=T();a(0,"app-doc-section",11)(1,"hk-table",48),u("groupExpandChange",function(d){h(e);let m=c();return v(m.onGroupExpand(d))}),n()()}if(l&2){let e=c();s("codeExample",e.groupedCode),i(),s("data",e.users())("config",e.groupedConfig)}}function ce(l,t){if(l&1){let e=T();a(0,"app-doc-section",12)(1,"hk-table",49),u("columnReorder",function(d){h(e);let m=c();return v(m.onColumnReorder(d))})("rowReorder",function(d){h(e);let m=c();return v(m.onRowReorder(d))}),n()()}if(l&2){let e=c();s("codeExample",e.reorderableCode),i(),s("data",e.reorderableUsers())("config",e.reorderableConfig)}}function pe(l,t){if(l&1){let e=T();a(0,"app-doc-section",13)(1,"hk-table",50),u("cellEdit",function(d){h(e);let m=c();return v(m.onCellEdit(d))})("selectionChange",function(d){h(e);let m=c();return v(m.onSelection(d))}),n()()}if(l&2){let e=c();s("codeExample",e.keyboardCode),i(),s("data",e.editableUsers())("config",e.keyboardConfig)("paginationOptions",e.keyboardPaginationOptions)}}function me(l,t){if(l&1&&(a(0,"app-doc-section",14),p(1,"hk-table",31),n()),l&2){let e=c();s("codeExample",e.hierarchyCode),i(),s("data",e.employees())("config",e.hierarchyConfig)}}function ue(l,t){if(l&1&&(a(0,"app-doc-section",15),p(1,"hk-table",31),n()),l&2){let e=c();s("codeExample",e.masterDetailCode),i(),s("data",e.customers())("config",e.masterDetailConfig)}}function ge(l,t){if(l&1&&(a(0,"app-doc-section",16),p(1,"hk-table",31),n()),l&2){let e=c();s("codeExample",e.nestedMasterDetailCode),i(),s("data",e.employees())("config",e.nestedMasterDetailConfig)}}function be(l,t){if(l&1&&(a(0,"div",19),p(1,"app-api-table",51)(2,"app-api-table",52)(3,"app-api-table",53)(4,"app-api-table",54),n()),l&2){let e=c();i(),s("entries",e.tableInputDocs),i(),s("entries",e.tableOutputDocs),i(),s("entries",e.tableMethodDocs),i(),s("entries",e.tableContentDocs)}}function fe(l,t){if(l&1&&(a(0,"div",19)(1,"div")(2,"h2",55),r(3,"TablePaginationComponent"),n(),a(4,"p",56),r(5," Selector: "),a(6,"code",57),r(7,"hk-table-pagination"),n(),r(8," \u2014 Rendered automatically by "),a(9,"code",57),r(10,"hk-table"),n(),r(11," when "),a(12,"code",57),r(13,"paginationOptions"),n(),r(14," is provided. Can also be used standalone. "),n()(),p(15,"app-api-table",58)(16,"app-api-table",59)(17,"div",60),a(18,"div")(19,"h2",55),r(20,"TableFilterComponent"),n(),a(21,"p",56),r(22," Selector: "),a(23,"code",57),r(24,"hk-table-filter"),n(),r(25," \u2014 Rendered inside column header dropdowns by "),a(26,"code",57),r(27,"hk-table"),n(),r(28," when filtering is enabled. "),n()(),p(29,"app-api-table",61)(30,"app-api-table",62)(31,"div",60),a(32,"div")(33,"h2",55),r(34,"TableGlobalSearchComponent"),n(),a(35,"p",56),r(36," Selector: "),a(37,"code",57),r(38,"hk-table-global-search"),n(),r(39," \u2014 Rendered above the table by "),a(40,"code",57),r(41,"hk-table"),n(),r(42," when "),a(43,"code",57),r(44,"globalSearch.enabled"),n(),r(45," is true. "),n()(),p(46,"app-api-table",63)(47,"app-api-table",64)(48,"div",60),a(49,"div")(50,"h2",55),r(51,"TableColumnVisibilityComponent"),n(),a(52,"p",56),r(53," Selector: "),a(54,"code",57),r(55,"hk-table-column-visibility"),n(),r(56," \u2014 Rendered in the toolbar by "),a(57,"code",57),r(58,"hk-table"),n(),r(59," when "),a(60,"code",57),r(61,"columnVisibility.enabled"),n(),r(62," is true. "),n()(),p(63,"app-api-table",65)(64,"app-api-table",66),n()),l&2){let e=c();i(15),s("entries",e.paginationInputDocs),i(),s("entries",e.paginationOutputDocs),i(13),s("entries",e.filterInputDocs),i(),s("entries",e.filterOutputDocs),i(16),s("entries",e.globalSearchInputDocs),i(),s("entries",e.globalSearchOutputDocs),i(16),s("entries",e.colVisInputDocs),i(),s("entries",e.colVisOutputDocs)}}function ye(l,t){if(l&1&&(a(0,"div",19)(1,"div",67)(2,"div",68)(3,"h3",69),r(4,"createTable() Usage"),n(),a(5,"p",70),r(6," The "),a(7,"code"),r(8,"createTable()"),n(),r(9," factory function converts a flat "),a(10,"code"),r(11,"FieldConfig<T>"),n(),r(12," into a resolved "),a(13,"code"),r(14,"FieldConfiguration<T>"),n(),r(15," used by the table input. "),n(),p(16,"app-code-block",71),n()(),p(17,"app-api-table",72)(18,"app-api-table",73),n()),l&2){let e=c();i(16),s("code",e.builderCode),i(),s("entries",e.builderFieldConfigDocs),i(),s("entries",e.builderPaginationDocs)}}function he(l,t){if(l&1&&(a(0,"div",19),p(1,"app-api-table",74)(2,"app-api-table",75)(3,"app-api-table",76)(4,"app-api-table",77),a(5,"div",67)(6,"div",68)(7,"h3",69),r(8,"Filtering Setup Example"),n(),p(9,"app-code-block",71),n()()()),l&2){let e=c();i(),s("entries",e.filterTypeEnumDocs),i(),s("entries",e.filterOperatorEnumDocs),i(),s("entries",e.columnFilterInterfaceDocs),i(),s("entries",e.globalSearchConfigDocs),i(5),s("code",e.filteringExampleCode)}}function ve(l,t){if(l&1&&(a(0,"div",19)(1,"div",67)(2,"div",68)(3,"h3",69),r(4,"FieldConfig"),n(),p(5,"app-code-block",71),n()(),a(6,"div",67)(7,"div",68)(8,"h3",69),r(9,"ColumnDefinition"),n(),p(10,"app-code-block",71),n()(),a(11,"div",67)(12,"div",68)(13,"h3",69),r(14,"PaginationOptions"),n(),p(15,"app-code-block",71),n()(),a(16,"div",67)(17,"div",68)(18,"h3",69),r(19,"FilterConfig & ColumnFilter"),n(),p(20,"app-code-block",71),n()(),a(21,"div",67)(22,"div",68)(23,"h3",69),r(24,"GlobalSearchConfig"),n(),p(25,"app-code-block",71),n()(),a(26,"div",67)(27,"div",68)(28,"h3",69),r(29,"ColumnVisibilityConfig"),n(),p(30,"app-code-block",71),n()(),a(31,"div",67)(32,"div",68)(33,"h3",69),r(34,"VirtualScrollConfig"),n(),p(35,"app-code-block",71),n()(),a(36,"div",67)(37,"div",68)(38,"h3",69),r(39,"GroupConfig"),n(),p(40,"app-code-block",71),n()(),a(41,"div",67)(42,"div",68)(43,"h3",69),r(44,"TreeTableConfig"),n(),p(45,"app-code-block",71),n()(),a(46,"div",67)(47,"div",68)(48,"h3",69),r(49,"ChildGridConfig"),n(),p(50,"app-code-block",71),n()(),a(51,"div",67)(52,"div",68)(53,"h3",69),r(54,"MasterDetailConfig"),n(),p(55,"app-code-block",71),n()(),a(56,"div",67)(57,"div",68)(58,"h3",69),r(59,"TableAction & TableBulkAction"),n(),p(60,"app-code-block",71),n()(),a(61,"div",67)(62,"div",68)(63,"h3",69),r(64,"Event Types"),n(),p(65,"app-code-block",71),n()(),a(66,"div",67)(67,"div",68)(68,"h3",69),r(69,"Footer Types"),n(),p(70,"app-code-block",71),n()(),a(71,"div",67)(72,"div",68)(73,"h3",69),r(74,"AggregateFunction"),n(),p(75,"app-code-block",71),n()()()),l&2){let e=c();i(5),s("code",e.fieldConfigType),i(5),s("code",e.columnDefinitionType),i(5),s("code",e.paginationOptionsType),i(5),s("code",e.filterTypes),i(5),s("code",e.globalSearchConfigType),i(5),s("code",e.columnVisibilityConfigType),i(5),s("code",e.virtualScrollConfigType),i(5),s("code",e.groupConfigType),i(5),s("code",e.treeTableConfigType),i(5),s("code",e.childGridConfigType),i(5),s("code",e.masterDetailConfigType),i(5),s("code",e.actionTypes),i(5),s("code",e.eventTypes),i(5),s("code",e.footerTypes),i(5),s("code",e.aggregateFunctionType)}}var W=class l{toast=P(G);activeTab=C("basic");apiTab=C("hk-table");users=C([{id:1,name:"John Doe",email:"john@example.com",role:"admin",status:"active",department:"Engineering",salary:12e4,joinDate:new Date("2022-01-15")},{id:2,name:"Jane Smith",email:"jane@example.com",role:"editor",status:"active",department:"Marketing",salary:95e3,joinDate:new Date("2022-03-20")},{id:3,name:"Bob Johnson",email:"bob@example.com",role:"viewer",status:"inactive",department:"Sales",salary:75e3,joinDate:new Date("2021-11-10")},{id:4,name:"Alice Brown",email:"alice@example.com",role:"editor",status:"active",department:"Engineering",salary:11e4,joinDate:new Date("2023-02-01")},{id:5,name:"Charlie Wilson",email:"charlie@example.com",role:"admin",status:"pending",department:"HR",salary:13e4,joinDate:new Date("2020-06-15")},{id:6,name:"Diana Prince",email:"diana@example.com",role:"viewer",status:"active",department:"Finance",salary:85e3,joinDate:new Date("2023-05-20")},{id:7,name:"Edward Stone",email:"edward@example.com",role:"editor",status:"active",department:"Engineering",salary:105e3,joinDate:new Date("2022-08-10")},{id:8,name:"Fiona Green",email:"fiona@example.com",role:"viewer",status:"inactive",department:"Marketing",salary:7e4,joinDate:new Date("2021-04-05")}]);selectedUsers=C([]);activeUser=C(null);activeUsers=C([]);activeUserNames=x(()=>this.activeUsers().map(t=>t.name).join(", "));basicConfig=f({visible:["id","name","email","role","status"],headers:{id:"ID",name:"Full Name",email:"Email Address",role:"Role",status:"Status"},formatters:{role:t=>String(t).charAt(0).toUpperCase()+String(t).slice(1),status:t=>`<span class="badge ${{active:"badge-success",inactive:"badge-error",pending:"badge-warning"}[String(t)]||""}">${t}</span>`}});selectableRowConfig=f({visible:["id","name","email","role","department","status"],headers:{id:"ID",name:"Full Name",email:"Email",role:"Role",department:"Department",status:"Status"},selectableRows:!0,formatters:{role:t=>`<span class="capitalize">${t}</span>`,status:t=>`<span class="badge badge-sm ${{active:"badge-success",inactive:"badge-error",pending:"badge-warning"}[String(t)]||""}">${t}</span>`},rowClass:t=>({"bg-error/10":t.status==="inactive","bg-warning/10":t.status==="pending"})});multiSelectableRowConfig=f({visible:["id","name","email","role","department","status"],headers:{id:"ID",name:"Full Name",email:"Email",role:"Role",department:"Department",status:"Status"},selectableRows:"multi",selectedRowClass:"bg-accent/20",formatters:{role:t=>`<span class="capitalize">${t}</span>`,status:t=>`<span class="badge badge-sm ${{active:"badge-success",inactive:"badge-error",pending:"badge-warning"}[String(t)]||""}">${t}</span>`}});fullConfig=f({visible:["id","name","email","role","department","salary","status","joinDate"],headers:{id:"ID",name:"Name",email:"Email",role:"Role",department:"Department",salary:"Salary",status:"Status",joinDate:"Join Date"},formatters:{salary:t=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(t)),joinDate:t=>new Date(t).toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"}),status:t=>`<span class="badge badge-sm ${{active:"badge-success",inactive:"badge-error",pending:"badge-warning"}[String(t)]||""}">${t}</span>`,role:t=>`<span class="capitalize">${t}</span>`},hasSelection:!0,hasActions:!0,actions:[{type:"view",label:"View",icon:"Eye",action:t=>this.toast.info(`Viewing ${t.name}`)},{type:"edit",label:"Edit",icon:"Pencil",action:t=>this.toast.info(`Editing ${t.name}`)},{type:"delete",label:"Delete",icon:"Trash2",action:t=>this.toast.warning(`Delete ${t.name}?`)}],bulkActions:[{type:"delete",label:"Delete Selected",icon:"Trash2",action:t=>this.toast.warning(`Delete ${t.length} users?`)},{type:"export",label:"Export",icon:"Download",action:(t,e)=>this.toast.success(`Exporting ${t.length} users as ${e?.label??"file"}`)}],filters:[{field:"role",type:"select",options:[{label:"Admin",value:"admin"},{label:"Editor",value:"editor"},{label:"Viewer",value:"viewer"}]},{field:"status",type:"select",options:[{label:"Active",value:"active"},{label:"Inactive",value:"inactive"},{label:"Pending",value:"pending"}]},{field:"department",type:"select",options:[{label:"Engineering",value:"Engineering"},{label:"Marketing",value:"Marketing"},{label:"Sales",value:"Sales"},{label:"HR",value:"HR"},{label:"Finance",value:"Finance"}]}],globalSearch:{enabled:!0,mode:"fuzzy",placeholder:"Search users...",debounceTime:300},columnVisibility:{enabled:!0,alwaysVisible:["name"],defaultVisible:["id","name","email","role","status"]}});paginationOptions={mode:"offset",pageSize:5,pageSizeOptions:[5,10,25],totalItems:8};stickyConfig=f({visible:["id","name","email","role","department","salary","status","joinDate"],headers:{id:"ID",name:"Name",email:"Email",role:"Role",department:"Department",salary:"Salary",status:"Status",joinDate:"Join Date"},formatters:{salary:t=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(t)),joinDate:t=>new Date(t).toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"})},hasSelection:!0,hasActions:!0,actions:[{type:"view",label:"View",icon:"Eye",action:t=>this.toast.info(`Viewing ${t.name}`)},{type:"edit",label:"Edit",icon:"Pencil",action:t=>this.toast.info(`Editing ${t.name}`)}],stickyColumns:{stickySelection:!0,stickyActions:!0}});resizableConfig=f({visible:["id","name","email","role","department","salary","status"],headers:{id:"ID",name:"Name",email:"Email",role:"Role",department:"Department",salary:"Salary",status:"Status"},formatters:{salary:t=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(t))},enableColumnResizing:!0,resizeMode:"expand"});virtualScrollUsers=C(this.generateVirtualScrollData(1e3));virtualScrollConfig=f({visible:["id","name","email","role","department","salary","status"],headers:{id:"ID",name:"Name",email:"Email",role:"Role",department:"Department",salary:"Salary",status:"Status"},formatters:{salary:t=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(t))},virtualScroll:{enabled:!0,itemHeight:48,viewportHeight:"400px"}});editableUsers=C([...this.users()]);editableConfig=f({visible:["id","name","email","role","salary","status"],headers:{id:"ID",name:"Name",email:"Email",role:"Role",salary:"Salary",status:"Status"},formatters:{salary:t=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(t)),status:t=>`<span class="badge badge-sm ${{active:"badge-success",inactive:"badge-error",pending:"badge-warning"}[String(t)]||""}">${t}</span>`},enableInlineEditing:!0,cellEditors:{name:{type:"text"},email:{type:"text"},salary:{type:"number",validator:t=>Number(t)>0||"Salary must be positive"},role:{type:"select",options:[{label:"Admin",value:"admin"},{label:"Editor",value:"editor"},{label:"Viewer",value:"viewer"}]}}});footerConfig=f({visible:["id","name","department","salary","status"],headers:{id:"ID",name:"Name",department:"Department",salary:"Salary",status:"Status"},formatters:{salary:["currency","USD"]},footerRows:[{columns:{salary:{fn:"sum",label:"Total"},id:{fn:"count",label:"Rows"}}},{columns:{salary:{fn:"avg",label:"Average"},id:{fn:"max",label:"Max ID"}}},{columns:{salary:{fn:"median",label:"Median"},department:{fn:"distinctCount",label:"Departments"}}}]});colspanFooterConfig=f({visible:["id","name","department","salary","status"],headers:{id:"ID",name:"Name",department:"Department",salary:"Salary",status:"Status"},formatters:{salary:["currency","USD"]},footerRows:[{cells:[{colspan:3},{colspan:1,fn:"sum",field:"salary",label:"Total",format:t=>`$${t.toLocaleString()}`},{colspan:1,fn:"count",field:"id",label:"Rows"}]},{cells:[{colspan:3,label:"Statistics",class:"text-right font-bold"},{colspan:1,fn:"avg",field:"salary",label:"Avg",format:t=>`$${Math.round(t).toLocaleString()}`},{colspan:1,fn:"distinctCount",field:"department",label:"Depts"}]}]});customFooterConfig=f({visible:["id","name","department","salary","status"],headers:{id:"ID",name:"Name",department:"Department",salary:"Salary",status:"Status"},formatters:{salary:["currency","USD"]}});uniqueDepartments(t){return[...new Set(t.map(e=>e.department))]}salaryTotal=x(()=>this.users().reduce((t,e)=>t+e.salary,0));salaryAvg=x(()=>{let t=this.users();return t.length?Math.round(this.salaryTotal()/t.length):0});expandableConfig=f({visible:["id","name","role","department","status"],headers:{id:"ID",name:"Name",role:"Role",department:"Department",status:"Status"},formatters:{status:t=>`<span class="badge badge-sm ${{active:"badge-success",inactive:"badge-error",pending:"badge-warning"}[String(t)]||""}">${t}</span>`},expandableDetail:!0,expandMode:"multi"});groupedConfig=f({visible:["id","name","role","salary","status"],headers:{id:"ID",name:"Name",role:"Role",salary:"Salary",status:"Status"},formatters:{salary:["currency","USD"],status:t=>`<span class="badge badge-sm ${{active:"badge-success",inactive:"badge-error",pending:"badge-warning"}[String(t)]||""}">${t}</span>`},grouping:{groupBy:"department",initiallyExpanded:!0,groupHeaderLabel:(t,e)=>`${t} (${e.length} employees)`,captionAggregates:{columns:{salary:{fn:"min",label:"Min"}}},groupFooterRows:[{columns:{salary:{fn:"sum",label:"Total"},id:{fn:"count",label:"Count"}}},{columns:{salary:{fn:"avg",label:"Average"}}}]}});reorderableUsers=C([...this.users()]);reorderableConfig=f({visible:["id","name","email","role","department","salary"],headers:{id:"ID",name:"Name",email:"Email",role:"Role",department:"Department",salary:"Salary"},formatters:{salary:t=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(t))},enableColumnReorder:!0,enableRowReorder:!0,showDragHandle:!0});keyboardConfig=f({visible:["id","name","email","role","salary","status"],headers:{id:"ID",name:"Name",email:"Email",role:"Role",salary:"Salary",status:"Status"},formatters:{salary:t=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(t)),status:t=>`<span class="badge badge-sm ${{active:"badge-success",inactive:"badge-error",pending:"badge-warning"}[String(t)]||""}">${t}</span>`},hasSelection:!0,enableKeyboardNavigation:!0,enableInlineEditing:!0,cellEditors:{name:{type:"text"},email:{type:"text"},salary:{type:"number",validator:t=>Number(t)>0||"Salary must be positive"},role:{type:"select",options:[{label:"Admin",value:"admin"},{label:"Editor",value:"editor"},{label:"Viewer",value:"viewer"}]}}});keyboardPaginationOptions={mode:"offset",pageSize:8,pageSizeOptions:[5,8,10],totalItems:8};orderItemChildConfig=f({visible:["itemId","sku","description","qty","price"],headers:{itemId:"Item ID",sku:"SKU",description:"Description",qty:"Qty",price:"Price"},formatters:{price:t=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(t))}});orderChildConfig=f({visible:["orderId","product","quantity","unitPrice","orderDate"],headers:{orderId:"Order ID",product:"Product",quantity:"Qty",unitPrice:"Price",orderDate:"Date"},formatters:{unitPrice:t=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(t))},childGrid:{config:this.orderItemChildConfig,childDataProperty:"items",bordered:!0}});hierarchyConfig=f({visible:["id","name","title","hireDate"],headers:{id:"ID",name:"Name",title:"Title",hireDate:"Hire Date"},childGrid:{config:this.orderChildConfig,childDataProperty:"orders",pagination:{mode:"offset",pageSize:5,pageSizeOptions:[3,5,10]},bordered:!0}});employees=C([{id:1,name:"Alice Martin",title:"Senior Engineer",hireDate:"2020-03-15",orders:[{orderId:101,product:'Laptop Pro 16"',quantity:1,unitPrice:2499,orderDate:"2024-01-10",items:[{itemId:1,sku:"LP16-SLV",description:'Laptop Pro 16" Silver',qty:1,price:2499}]},{orderId:102,product:"Mechanical Keyboard",quantity:2,unitPrice:159,orderDate:"2024-02-05",items:[{itemId:1,sku:"KB-RED",description:"Cherry MX Red Switch",qty:1,price:159},{itemId:2,sku:"KB-BLU",description:"Cherry MX Blue Switch",qty:1,price:159}]},{orderId:103,product:"USB-C Hub",quantity:1,unitPrice:79,orderDate:"2024-03-12",items:[{itemId:1,sku:"HUB-7P",description:"USB-C Hub 7-Port",qty:1,price:79}]},{orderId:104,product:"4K Monitor",quantity:1,unitPrice:599,orderDate:"2024-04-20",items:[{itemId:1,sku:"MON-27",description:'27" 4K IPS Monitor',qty:1,price:599}]},{orderId:105,product:"Webcam HD",quantity:1,unitPrice:129,orderDate:"2024-05-15",items:[{itemId:1,sku:"WC-1080",description:"1080p Webcam",qty:1,price:129}]},{orderId:106,product:"Desk Lamp",quantity:1,unitPrice:45,orderDate:"2024-06-01",items:[{itemId:1,sku:"LAMP-LED",description:"LED Desk Lamp",qty:1,price:45}]}]},{id:2,name:"Bob Chen",title:"Product Manager",hireDate:"2019-07-01",orders:[{orderId:201,product:"Whiteboard Markers",quantity:12,unitPrice:3,orderDate:"2024-01-20",items:[{itemId:1,sku:"WBM-BLK",description:"Black Marker",qty:4,price:3},{itemId:2,sku:"WBM-RED",description:"Red Marker",qty:4,price:3},{itemId:3,sku:"WBM-BLU",description:"Blue Marker",qty:4,price:3}]},{orderId:202,product:"Notebook Set",quantity:5,unitPrice:12,orderDate:"2024-02-18",items:[{itemId:1,sku:"NB-A4",description:"A4 Lined Notebook",qty:3,price:12},{itemId:2,sku:"NB-A5",description:"A5 Grid Notebook",qty:2,price:12}]},{orderId:203,product:"Standing Desk",quantity:1,unitPrice:899,orderDate:"2024-03-05",items:[{itemId:1,sku:"DSK-EL",description:'Electric Standing Desk 60"',qty:1,price:899}]},{orderId:204,product:"Ergonomic Chair",quantity:1,unitPrice:749,orderDate:"2024-04-10",items:[{itemId:1,sku:"CHR-ERG",description:"Ergonomic Mesh Chair",qty:1,price:749}]},{orderId:205,product:"Presentation Remote",quantity:1,unitPrice:49,orderDate:"2024-05-22",items:[{itemId:1,sku:"RMT-LS",description:"Laser Presentation Remote",qty:1,price:49}]}]},{id:3,name:"Carol Davis",title:"UX Designer",hireDate:"2021-11-10",orders:[{orderId:301,product:"Drawing Tablet",quantity:1,unitPrice:349,orderDate:"2024-01-15",items:[{itemId:1,sku:"TAB-MED",description:"Drawing Tablet Medium",qty:1,price:349}]},{orderId:302,product:"Color Calibrator",quantity:1,unitPrice:199,orderDate:"2024-02-28",items:[{itemId:1,sku:"CAL-PRO",description:"Display Calibrator Pro",qty:1,price:199}]},{orderId:303,product:"Design Book Bundle",quantity:3,unitPrice:45,orderDate:"2024-03-20",items:[{itemId:1,sku:"BK-UX",description:"UX Design Handbook",qty:1,price:45},{itemId:2,sku:"BK-TYP",description:"Typography Essentials",qty:1,price:45},{itemId:3,sku:"BK-CLR",description:"Color Theory Guide",qty:1,price:45}]},{orderId:304,product:"Stylus Pen Set",quantity:2,unitPrice:29,orderDate:"2024-04-05",items:[{itemId:1,sku:"PEN-FN",description:"Fine Tip Stylus",qty:1,price:29},{itemId:2,sku:"PEN-BRD",description:"Broad Tip Stylus",qty:1,price:29}]},{orderId:305,product:"Monitor Arm",quantity:1,unitPrice:119,orderDate:"2024-05-10",items:[{itemId:1,sku:"ARM-DL",description:"Dual Monitor Arm",qty:1,price:119}]},{orderId:306,product:"Headphones Pro",quantity:1,unitPrice:299,orderDate:"2024-06-15",items:[{itemId:1,sku:"HP-ANC",description:"ANC Headphones",qty:1,price:299}]},{orderId:307,product:"Mouse Pad XL",quantity:1,unitPrice:25,orderDate:"2024-07-01",items:[{itemId:1,sku:"MP-XL",description:"Extended Mouse Pad",qty:1,price:25}]}]},{id:4,name:"David Kim",title:"DevOps Lead",hireDate:"2018-05-20",orders:[{orderId:401,product:"Server Rack Mount",quantity:2,unitPrice:189,orderDate:"2024-01-08",items:[{itemId:1,sku:"RCK-2U",description:"2U Rack Mount",qty:1,price:189},{itemId:2,sku:"RCK-4U",description:"4U Rack Mount",qty:1,price:189}]},{orderId:402,product:"Network Switch",quantity:1,unitPrice:459,orderDate:"2024-02-14",items:[{itemId:1,sku:"SW-48",description:"48-Port Managed Switch",qty:1,price:459}]},{orderId:403,product:"SSD 2TB",quantity:4,unitPrice:149,orderDate:"2024-03-25",items:[{itemId:1,sku:"SSD-NVM",description:"NVMe SSD 2TB",qty:4,price:149}]},{orderId:404,product:"KVM Switch",quantity:1,unitPrice:89,orderDate:"2024-04-18",items:[{itemId:1,sku:"KVM-4P",description:"4-Port KVM Switch",qty:1,price:89}]},{orderId:405,product:"Cable Management Kit",quantity:3,unitPrice:35,orderDate:"2024-05-30",items:[{itemId:1,sku:"CBL-VLC",description:"Velcro Cable Ties",qty:2,price:15},{itemId:2,sku:"CBL-TRY",description:"Cable Tray",qty:1,price:35}]}]},{id:5,name:"Eva Lopez",title:"QA Engineer",hireDate:"2022-01-05",orders:[{orderId:501,product:"Testing Device Pack",quantity:1,unitPrice:799,orderDate:"2024-02-01",items:[{itemId:1,sku:"DEV-AND",description:"Android Test Device",qty:1,price:399},{itemId:2,sku:"DEV-IOS",description:"iOS Test Device",qty:1,price:400}]},{orderId:502,product:"Dual Monitor Stand",quantity:1,unitPrice:139,orderDate:"2024-03-15",items:[{itemId:1,sku:"STD-DL",description:"Dual Monitor Stand",qty:1,price:139}]},{orderId:503,product:"USB Hub 7-Port",quantity:2,unitPrice:45,orderDate:"2024-04-22",items:[{itemId:1,sku:"HUB-7U",description:"USB 3.0 Hub 7-Port",qty:2,price:45}]},{orderId:504,product:"Noise-Cancelling Earbuds",quantity:1,unitPrice:179,orderDate:"2024-05-08",items:[{itemId:1,sku:"EB-ANC",description:"ANC Wireless Earbuds",qty:1,price:179}]},{orderId:505,product:"Laptop Stand",quantity:1,unitPrice:59,orderDate:"2024-06-20",items:[{itemId:1,sku:"STD-AL",description:"Aluminum Laptop Stand",qty:1,price:59}]},{orderId:506,product:"Portable Charger",quantity:2,unitPrice:39,orderDate:"2024-07-10",items:[{itemId:1,sku:"CHG-10K",description:"10000mAh Charger",qty:1,price:29},{itemId:2,sku:"CHG-20K",description:"20000mAh Charger",qty:1,price:49}]},{orderId:507,product:"Screen Protector",quantity:3,unitPrice:15,orderDate:"2024-08-01",items:[{itemId:1,sku:"SP-13",description:'13" Screen Protector',qty:2,price:15},{itemId:2,sku:"SP-16",description:'16" Screen Protector',qty:1,price:15}]},{orderId:508,product:"Cleaning Kit",quantity:1,unitPrice:22,orderDate:"2024-09-05",items:[{itemId:1,sku:"CLN-KIT",description:"Electronics Cleaning Kit",qty:1,price:22}]}]}]);nestedMasterDetailItemConfig=f({visible:["itemId","sku","description","qty","price"],headers:{itemId:"Item ID",sku:"SKU",description:"Description",qty:"Qty",price:"Price"},formatters:{price:t=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(t))}});nestedMasterDetailOrderConfig=f({visible:["orderId","product","quantity","unitPrice","orderDate"],headers:{orderId:"Order ID",product:"Product",quantity:"Qty",unitPrice:"Price",orderDate:"Date"},formatters:{unitPrice:t=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(t))},masterDetail:{config:this.nestedMasterDetailItemConfig,detailDataProperty:"items",headerText:t=>`Line items for Order #${t.orderId} \u2014 ${t.product}`}});nestedMasterDetailConfig=f({visible:["id","name","title","hireDate"],headers:{id:"ID",name:"Name",title:"Title",hireDate:"Hire Date"},masterDetail:{config:this.nestedMasterDetailOrderConfig,detailDataProperty:"orders",headerText:t=>`Orders for ${t.name} \u2014 ${t.title}`,pagination:{mode:"offset",pageSize:5,pageSizeOptions:[3,5,10]}}});masterDetailOrderConfig=f({visible:["orderId","freight","shipName","shipCountry","shipAddress","orderDate"],headers:{orderId:"Order ID",freight:"Freight",shipName:"Ship Name",shipCountry:"Ship Country",shipAddress:"Ship Address",orderDate:"Order Date"},formatters:{freight:t=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(t))}});masterDetailConfig=f({visible:["customerId","customerName","companyName","contactTitle","country"],headers:{customerId:"ID",customerName:"Customer Name",companyName:"Company",contactTitle:"Title",country:"Country"},masterDetail:{config:this.masterDetailOrderConfig,detailDataProperty:"orders",headerText:t=>`Orders for ${t.customerName} \u2014 ${t.companyName}`,pagination:{mode:"offset",pageSize:5,pageSizeOptions:[3,5,10]}}});customers=C([{customerId:1,customerName:"Maria Anders",companyName:"Alfreds Futterkiste",contactTitle:"Sales Rep",country:"Germany",orders:[{orderId:10643,freight:29.46,shipName:"Alfreds Futterkiste",shipCountry:"Germany",shipAddress:"Obere Str. 57",orderDate:"2024-01-15"},{orderId:10692,freight:61.02,shipName:"Alfreds Futterkiste",shipCountry:"Germany",shipAddress:"Obere Str. 57",orderDate:"2024-02-20"},{orderId:10702,freight:23.94,shipName:"Alfreds Futterkiste",shipCountry:"Germany",shipAddress:"Obere Str. 57",orderDate:"2024-03-10"},{orderId:10835,freight:69.53,shipName:"Alfreds Futterkiste",shipCountry:"Germany",shipAddress:"Obere Str. 57",orderDate:"2024-04-05"},{orderId:10952,freight:40.42,shipName:"Alfreds Futterkiste",shipCountry:"Germany",shipAddress:"Obere Str. 57",orderDate:"2024-05-18"},{orderId:11011,freight:1.21,shipName:"Alfreds Futterkiste",shipCountry:"Germany",shipAddress:"Obere Str. 57",orderDate:"2024-06-22"}]},{customerId:2,customerName:"Ana Trujillo",companyName:"Emparedados y helados",contactTitle:"Owner",country:"Mexico",orders:[{orderId:10308,freight:1.61,shipName:"Ana Trujillo",shipCountry:"Mexico",shipAddress:"Avda. de la Constituci\xF3n 2222",orderDate:"2024-01-22"},{orderId:10625,freight:43.9,shipName:"Ana Trujillo",shipCountry:"Mexico",shipAddress:"Avda. de la Constituci\xF3n 2222",orderDate:"2024-03-01"},{orderId:10759,freight:11.99,shipName:"Ana Trujillo",shipCountry:"Mexico",shipAddress:"Avda. de la Constituci\xF3n 2222",orderDate:"2024-04-15"},{orderId:10926,freight:39.92,shipName:"Ana Trujillo",shipCountry:"Mexico",shipAddress:"Avda. de la Constituci\xF3n 2222",orderDate:"2024-05-20"}]},{customerId:3,customerName:"Antonio Moreno",companyName:"Antonio Moreno Taquer\xEDa",contactTitle:"Owner",country:"Mexico",orders:[{orderId:10365,freight:22,shipName:"Antonio Moreno",shipCountry:"Mexico",shipAddress:"Mataderos 2312",orderDate:"2024-02-10"},{orderId:10507,freight:47.45,shipName:"Antonio Moreno",shipCountry:"Mexico",shipAddress:"Mataderos 2312",orderDate:"2024-03-25"},{orderId:10535,freight:15.64,shipName:"Antonio Moreno",shipCountry:"Mexico",shipAddress:"Mataderos 2312",orderDate:"2024-05-05"},{orderId:10573,freight:84.84,shipName:"Antonio Moreno",shipCountry:"Mexico",shipAddress:"Mataderos 2312",orderDate:"2024-06-10"},{orderId:10677,freight:4.03,shipName:"Antonio Moreno",shipCountry:"Mexico",shipAddress:"Mataderos 2312",orderDate:"2024-07-18"}]},{customerId:4,customerName:"Thomas Hardy",companyName:"Around the Horn",contactTitle:"Sales Rep",country:"UK",orders:[{orderId:10355,freight:41.95,shipName:"Around the Horn",shipCountry:"UK",shipAddress:"120 Hanover Sq.",orderDate:"2024-01-08"},{orderId:10383,freight:34.24,shipName:"Around the Horn",shipCountry:"UK",shipAddress:"120 Hanover Sq.",orderDate:"2024-02-28"},{orderId:10453,freight:25.36,shipName:"Around the Horn",shipCountry:"UK",shipAddress:"120 Hanover Sq.",orderDate:"2024-04-12"}]},{customerId:5,customerName:"Christina Berglund",companyName:"Berglunds snabbk\xF6p",contactTitle:"Order Admin",country:"Sweden",orders:[{orderId:10278,freight:92.69,shipName:"Berglunds snabbk\xF6p",shipCountry:"Sweden",shipAddress:"Berguvsv\xE4gen 8",orderDate:"2024-01-30"},{orderId:10280,freight:8.98,shipName:"Berglunds snabbk\xF6p",shipCountry:"Sweden",shipAddress:"Berguvsv\xE4gen 8",orderDate:"2024-03-05"},{orderId:10384,freight:168.64,shipName:"Berglunds snabbk\xF6p",shipCountry:"Sweden",shipAddress:"Berguvsv\xE4gen 8",orderDate:"2024-04-22"},{orderId:10444,freight:3.5,shipName:"Berglunds snabbk\xF6p",shipCountry:"Sweden",shipAddress:"Berguvsv\xE4gen 8",orderDate:"2024-05-15"},{orderId:10524,freight:244.79,shipName:"Berglunds snabbk\xF6p",shipCountry:"Sweden",shipAddress:"Berguvsv\xE4gen 8",orderDate:"2024-06-28"},{orderId:10572,freight:116.43,shipName:"Berglunds snabbk\xF6p",shipCountry:"Sweden",shipAddress:"Berguvsv\xE4gen 8",orderDate:"2024-07-20"},{orderId:10626,freight:138.69,shipName:"Berglunds snabbk\xF6p",shipCountry:"Sweden",shipAddress:"Berguvsv\xE4gen 8",orderDate:"2024-08-10"}]}]);generateVirtualScrollData(t){let e=["admin","editor","viewer"],o=["active","inactive","pending"],d=["Engineering","Marketing","Sales","HR","Finance"],m=["John","Jane","Bob","Alice","Charlie","Diana","Edward","Fiona","George","Helen"],I=["Doe","Smith","Johnson","Brown","Wilson","Prince","Stone","Green","Taylor","White"];return Array.from({length:t},(Ce,S)=>({id:S+1,name:`${m[S%m.length]} ${I[S%I.length]}`,email:`user${S+1}@example.com`,role:e[S%e.length],status:o[S%o.length],department:d[S%d.length],salary:6e4+Math.floor(Math.random()*8e4),joinDate:new Date(2020+Math.floor(Math.random()*4),Math.floor(Math.random()*12),Math.floor(Math.random()*28)+1)}))}onSelection(t){this.selectedUsers.set([...t])}onActiveRowChange(t){this.activeUser.set(t)}onActiveRowsChange(t){this.activeUsers.set(t)}onSort(t){console.log("Sort:",t)}onFilter(t){console.log("Filter:",t)}onSearch(t){console.log("Search:",t)}onPageChange(t){console.log("Page:",t)}onColumnResize(t){console.log("Column resized:",t)}onCellEdit(t){console.log("Cell edit:",t),this.editableUsers.update(e=>e.map(o=>o===t.row?A(R({},o),{[t.field]:t.newValue}):o)),this.toast.success(`Updated ${t.field} for ${t.row.name}`)}onDetailExpand(t){console.log("Detail expand:",t)}onGroupExpand(t){console.log("Group expand:",t)}onColumnReorder(t){console.log("Column reorder:",t),this.toast.info(`Column moved from position ${t.previousIndex+1} to ${t.currentIndex+1}`)}onRowReorder(t){console.log("Row reorder:",t),this.reorderableUsers.update(e=>{let o=[...e],[d]=o.splice(t.previousIndex,1);return o.splice(t.currentIndex,0,d),o}),this.toast.info(`Row moved from position ${t.previousIndex+1} to ${t.currentIndex+1}`)}basicCode=`// TypeScript
const config = createTable<User>({
  visible: ['id', 'name', 'email', 'role', 'status'],
  headers: { id: 'ID', name: 'Full Name' },
  formatters: {
    status: (v) => \`<span class="badge">\${v}</span>\`,
  },
});

// Template
<hk-table [data]="users()" [config]="config" />`;selectableRowCode=`// TypeScript
const config = createTable<User>({
  visible: ['id', 'name', 'email', 'role', 'department', 'status'],
  selectableRows: true,              // click-to-highlight
  // selectedRowClass: 'bg-accent/20', // custom highlight (default: 'bg-primary/10')
  rowClass: (row) => ({              // conditional per-row styling
    'bg-error/10': row.status === 'inactive',
    'bg-warning/10': row.status === 'pending',
  }),
});

// Template
<hk-table
  [data]="users()"
  [config]="config"
  (activeRowChange)="onActiveRowChange($event)" />

// Handler
onActiveRowChange(user: User | null) {
  console.log('Active row:', user);
}`;multiSelectableRowCode=`// TypeScript
const config = createTable<User>({
  visible: ['id', 'name', 'email', 'role', 'department', 'status'],
  selectableRows: 'multi',            // click to toggle multiple rows
  selectedRowClass: 'bg-accent/20',   // custom highlight color
});

// Template
<hk-table
  [data]="users()"
  [config]="config"
  (activeRowsChange)="onActiveRowsChange($event)" />

// Handler
onActiveRowsChange(users: readonly User[]) {
  console.log('Selected rows:', users);
}`;fullCode=`// TypeScript
const config = createTable<User>({
  visible: ['id', 'name', 'email', 'role', 'salary', 'status'],
  hasSelection: true,
  hasActions: true,
  actions: [
    { type: 'view', label: 'View', icon: 'Eye', action: (row) => {} },
  ],
  bulkActions: [
    { type: 'delete', label: 'Delete', icon: 'Trash2', action: (rows) => {} },
  ],
  filters: [
    { field: 'role', type: 'select', options: [...] },
  ],
  globalSearch: { enabled: true, mode: 'fuzzy' },
  columnVisibility: { enabled: true },
});

// Template
<hk-table
  [data]="users()"
  [config]="config"
  [paginationOptions]="{ mode: 'offset', pageSize: 10 }"
  (selectionChange)="onSelection($event)"
  (sortChange)="onSort($event)"
/>`;builderCode=`import { createTable } from '@hakistack/ng-daisyui';

const config = createTable<User>({
  visible: ['id', 'name', 'email', 'status'],
  headers: { id: 'ID', name: 'Full Name' },
  formatters: {
    status: (value) => \`<span class="badge">\${value}</span>\`,
  },
  hasSelection: true,
  hasActions: true,
  actions: [
    { type: 'edit', label: 'Edit', icon: 'Pencil', action: (row) => {} },
  ],
  bulkActions: [
    { type: 'delete', label: 'Delete', icon: 'Trash2', action: (rows) => {} },
  ],
  filters: [
    { field: 'status', type: 'select', options: [{ label: 'Active', value: 'active' }] },
  ],
  globalSearch: { enabled: true, mode: 'fuzzy', debounceTime: 300 },
  columnVisibility: { enabled: true, alwaysVisible: ['name'] },
});`;stickyCode=`const config = createTable<User>({
  visible: ['id', 'name', 'email', 'role', 'department', 'salary', 'status', 'joinDate'],
  hasSelection: true,
  hasActions: true,
  actions: [...],
  stickyColumns: {
    stickySelection: true,  // auto-pin checkbox column
    stickyActions: true,     // auto-pin actions column
  },
});

// Template \u2014 wrap in a constrained container to trigger horizontal scroll
<div style="max-width: 600px;">
  <hk-table [data]="users()" [config]="config" />
</div>`;resizableCode=`const config = createTable<User>({
  visible: ['id', 'name', 'email', 'role', 'department', 'salary'],
  enableColumnResizing: true,
  resizeMode: 'expand',  // 'fit' adjusts neighbor
});

<hk-table
  [data]="users()"
  [config]="config"
  (columnResize)="onResize($event)"
/>`;virtualScrollCode=`const config = createTable<User>({
  visible: ['id', 'name', 'email', 'role', 'department', 'salary'],
  virtualScroll: {
    enabled: true,
    itemHeight: 48,       // row height in px (required)
    viewportHeight: '400px',
  },
});

// Pagination is automatically hidden when virtual scroll is enabled
<hk-table [data]="thousandRows()" [config]="config" />`;editableCode=`const config = createTable<User>({
  visible: ['id', 'name', 'email', 'role', 'salary'],
  enableInlineEditing: true,
  cellEditors: {
    name: { type: 'text' },
    email: { type: 'text' },
    salary: {
      type: 'number',
      validator: (v) => Number(v) > 0 || 'Must be positive',
    },
    role: {
      type: 'select',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
        { label: 'Viewer', value: 'viewer' },
      ],
    },
  },
});

// Double-click a cell to edit. Enter to confirm, Escape to cancel.
<hk-table
  [data]="users()"
  [config]="config"
  (cellEdit)="onCellEdit($event)"
/>`;footerCode=`import { createTable } from '@hakistack/ng-daisyui';

const config = createTable<User>({
  visible: ['id', 'name', 'department', 'salary', 'status'],
  formatters: { salary: ['currency', 'USD'] },
  footerRows: [
    {
      columns: {
        salary: { fn: 'sum', label: 'Total' },
        id: { fn: 'count', label: 'Rows' },
      },
    },
    {
      columns: {
        salary: { fn: 'avg', label: 'Average' },
        id: { fn: 'max', label: 'Max ID' },
      },
    },
    {
      columns: {
        salary: { fn: 'median', label: 'Median' },
        department: { fn: 'distinctCount', label: 'Departments' },
      },
    },
  ],
});

// Legacy single-row footer (still supported):
// showFooter: true,
// footers: { salary: { fn: 'sum', label: 'Total' }, id: 'count' }

<hk-table [data]="users()" [config]="config" />`;colspanFooterCode=`import { createTable } from '@hakistack/ng-daisyui';

const config = createTable<User>({
  visible: ['id', 'name', 'department', 'salary', 'status'],
  formatters: { salary: ['currency', 'USD'] },
  footerRows: [
    {
      // Use 'cells' array instead of 'columns' for colspan layout
      cells: [
        { colspan: 3 },  // empty spacer spanning 3 columns
        { colspan: 1, fn: 'sum', field: 'salary', label: 'Total',
          format: (v) => \`$\${v.toLocaleString()}\` },
        { colspan: 1, fn: 'count', field: 'id', label: 'Rows' },
      ],
    },
    {
      cells: [
        { colspan: 3, label: 'Statistics', class: 'text-right font-bold' },
        { colspan: 1, fn: 'avg', field: 'salary', label: 'Avg',
          format: (v) => \`$\${Math.round(v).toLocaleString()}\` },
        { colspan: 1, fn: 'distinctCount', field: 'department', label: 'Depts' },
      ],
    },
  ],
});

<hk-table [data]="users()" [config]="config" />`;customFooterCode=`import { HkFooterDirective } from '@hakistack/ng-daisyui';

// No footer config needed \u2014 the template handles everything
const config = createTable<User>({
  visible: ['id', 'name', 'department', 'salary', 'status'],
  formatters: { salary: ['currency', 'USD'] },
});

// Template \u2014 use hkFooter for full layout freedom inside <tfoot>
<hk-table [data]="users()" [config]="config">
  <ng-template hkFooter let-data let-columns="columns">
    <div class="flex items-center justify-between px-2 py-1">
      <span>{{ data.length }} employees</span>
      <div class="flex gap-4">
        <span class="badge badge-success">Total: {{ salaryTotal() }}</span>
        <span class="badge badge-info">Avg: {{ salaryAvg() }}</span>
      </div>
    </div>
  </ng-template>
</hk-table>`;expandableCode=`const config = createTable<User>({
  visible: ['id', 'name', 'role', 'department', 'status'],
  expandableDetail: true,
  expandMode: 'multi',  // 'single' collapses others
});

// Template \u2014 provide a #rowDetail template
<hk-table [data]="users()" [config]="config" (detailExpansionChange)="onExpand($event)">
  <ng-template #rowDetail let-row>
    <div>
      <p>Email: {{ row.email }}</p>
      <p>Salary: {{ row.salary | number }}</p>
    </div>
  </ng-template>
</hk-table>`;groupedCode=`const config = createTable<User>({
  visible: ['id', 'name', 'role', 'salary', 'status'],
  formatters: { salary: ['currency', 'USD'] },
  grouping: {
    groupBy: 'department',
    initiallyExpanded: true,
    groupHeaderLabel: (value, rows) =>
      \`\${value} (\${rows.length} employees)\`,
    // Inline caption aggregates in group header
    captionAggregates: {
      columns: { salary: { fn: 'min', label: 'Min' } },
    },
    // Column-aligned multi-row group footers
    groupFooterRows: [
      { columns: {
          salary: { fn: 'sum', label: 'Total' },
          id: { fn: 'count', label: 'Count' },
      }},
      { columns: { salary: { fn: 'avg', label: 'Average' } } },
    ],
    // Legacy single-row footer (still supported):
    // aggregates: { salary: 'sum' },
    // showGroupFooter: true,
  },
});

<hk-table [data]="users()" [config]="config"
  (groupExpandChange)="onGroupExpand($event)" />`;reorderableCode=`const config = createTable<User>({
  visible: ['id', 'name', 'email', 'role', 'department', 'salary'],
  enableColumnReorder: true,   // drag column headers
  enableRowReorder: true,      // drag row handles
  showDragHandle: true,        // show grip icon
});

// Row reorder is auto-disabled when sort/filter/search is active
<hk-table [data]="users()" [config]="config"
  (columnReorder)="onColumnReorder($event)"
  (rowReorder)="onRowReorder($event)" />`;keyboardCode=`const config = createTable<User>({
  visible: ['id', 'name', 'email', 'role', 'salary', 'status'],
  hasSelection: true,
  enableKeyboardNavigation: true,
  enableInlineEditing: true,
  cellEditors: {
    name: { type: 'text' },
    salary: { type: 'number' },
  },
});

// Arrow keys: navigate cells
// Enter: start editing / toggle expand
// Space: toggle selection
// Home/End: jump to first/last column (Ctrl for row)
// Escape: clear focus
<hk-table [data]="users()" [config]="config"
  (cellEdit)="onCellEdit($event)"
  (selectionChange)="onSelection($event)" />`;hierarchyCode=`// Level 3: Order Items (deepest)
const itemConfig = createTable<OrderItem>({
  visible: ['itemId', 'sku', 'description', 'qty', 'price'],
  formatters: { price: ['currency', 'USD'] },
});

// Level 2: Orders \u2014 with its own childGrid pointing to items
const orderConfig = createTable<Order>({
  visible: ['orderId', 'product', 'quantity', 'unitPrice', 'orderDate'],
  formatters: { unitPrice: ['currency', 'USD'] },
  childGrid: {
    config: itemConfig,
    childDataProperty: 'items',
    bordered: true,
  },
});

// Level 1: Employees \u2014 parent table
const config = createTable<Employee>({
  visible: ['id', 'name', 'title', 'hireDate'],
  childGrid: {
    config: orderConfig,
    childDataProperty: 'orders',
    pagination: { mode: 'offset', pageSize: 5 },
    bordered: true,
  },
});

// N-level deep: each childGrid.config can itself have a childGrid
<hk-table [data]="employees()" [config]="config" />`;masterDetailCode=`// Detail table config
const detailConfig = createTable<Order>({
  visible: ['orderId', 'freight', 'shipName', 'shipCountry', 'orderDate'],
  formatters: { freight: ['currency', 'USD'] },
});

// Master table config with masterDetail
const config = createTable<Customer>({
  visible: ['customerId', 'customerName', 'companyName', 'country'],
  masterDetail: {
    config: detailConfig,
    detailDataProperty: 'orders',
    headerText: (row) => \`Orders for \${row.customerName}\`,
    pagination: { mode: 'offset', pageSize: 5 },
    autoSelectFirst: true,    // default: true
  },
});

// Template \u2014 single component, detail rendered automatically
<hk-table [data]="customers()" [config]="config" />

// You can also listen to row clicks:
<hk-table [data]="customers()" [config]="config"
  (rowClick)="onRowClick($event)"
  (masterDetailRowChange)="onMasterRowChange($event)" />`;nestedMasterDetailCode=`// Level 3: Line Items (deepest detail)
const itemConfig = createTable<OrderItem>({
  visible: ['itemId', 'sku', 'description', 'qty', 'price'],
  formatters: { price: ['currency', 'USD'] },
});

// Level 2: Orders \u2014 itself a master with line items as detail
const orderConfig = createTable<Order>({
  visible: ['orderId', 'product', 'quantity', 'unitPrice', 'orderDate'],
  formatters: { unitPrice: ['currency', 'USD'] },
  masterDetail: {
    config: itemConfig,
    detailDataProperty: 'items',
    headerText: (row) => \`Items for Order #\${row.orderId}\`,
  },
});

// Level 1: Employees \u2014 top-level master
const config = createTable<Employee>({
  visible: ['id', 'name', 'title', 'hireDate'],
  masterDetail: {
    config: orderConfig,
    detailDataProperty: 'orders',
    headerText: (row) => \`Orders for \${row.name}\`,
    pagination: { mode: 'offset', pageSize: 5 },
  },
});

// Each detail table is itself a master \u2014 drill down N levels deep
<hk-table [data]="employees()" [config]="config" />`;tableInputDocs=[{name:"data",type:"readonly T[] | null",default:"null",description:"Array of data rows to render in the table. Accepts flat arrays or hierarchical data for tree tables."},{name:"config",type:"FieldConfiguration<T> | null",default:"null",description:"Table configuration object produced by the createTable() builder. Controls columns, formatters, actions, filters, grouping, and all feature flags."},{name:"paginationOptions",type:"PaginationOptions | null",default:"null",description:"Pagination configuration. Supports offset (page number) and cursor (opaque token) modes. When null, pagination is hidden."},{name:"showFirstLastButtons",type:"boolean",default:"true",description:'Show the "jump to first page" and "jump to last page" buttons in the pagination bar.'},{name:"hidePageSize",type:"boolean",default:"false",description:"When true, hides the page-size selector in the pagination footer."},{name:"showPageSizeOptions",type:"boolean",default:"true",description:"When true, renders the page-size dropdown with the configured pageSizeOptions."},{name:"disabled",type:"boolean",default:"false",description:"Disables all interactive elements: sorting, filtering, pagination, selection, editing, and drag operations."}];tableOutputDocs=[{name:"selectionChange",type:"readonly T[]",description:'Emits the current set of selected rows whenever a checkbox is toggled or "select all" is used.'},{name:"pageChange",type:"PageSizeChange",description:"Emits { pageIndex, pageSize } when the user changes page or page size in offset mode."},{name:"cursorChange",type:"CursorPageChange",description:"Emits { cursor, direction } when the user clicks next/previous in cursor pagination mode."},{name:"sortChange",type:"SortChange",description:"Emits { field, direction } when a column header is clicked to toggle sorting. Direction cycles: Ascending -> Descending -> none."},{name:"sortFieldChange",type:"string",description:"Emits the currently sorted field name (or empty string when sort is cleared). Useful for two-way binding scenarios."},{name:"sortDirectionChange",type:"'Ascending' | 'Descending' | ''",description:"Emits the current sort direction. Companion to sortFieldChange for granular sort state tracking."},{name:"filterChange",type:"FilterChange<T>",description:"Emits when any column filter is applied, removed, or cleared. Payload includes the changed field plus all active filters."},{name:"globalSearchChange",type:"GlobalSearchChange",description:"Emits { searchTerm, mode } when the global search input value changes (after debounce)."},{name:"expansionChange",type:"{ row: T; expanded: boolean }",description:"Emits when a tree-table row is expanded or collapsed via the toggle chevron."},{name:"columnResize",type:"ColumnResizeEvent",description:"Emits { field, width, previousWidth } when a column resize operation completes."},{name:"cellEdit",type:"CellEditEvent<T>",description:"Emits { row, field, oldValue, newValue } when an inline cell edit is confirmed (Enter or blur)."},{name:"cellEditCancel",type:"{ row: T; field: string }",description:"Emits when an inline cell edit is cancelled via Escape."},{name:"cellEditError",type:"CellEditErrorEvent<T>",description:"Emits { row, field, value, error } when a cell edit fails the column validator."},{name:"detailExpansionChange",type:"RowExpandEvent<T>",description:"Emits { row, expanded } when an expandable detail row is expanded or collapsed."},{name:"columnReorder",type:"ColumnReorderEvent",description:"Emits { previousIndex, currentIndex, columns } when a column is dragged to a new position."},{name:"rowReorder",type:"RowReorderEvent<T>",description:"Emits { row, previousIndex, currentIndex, data } when a row is dragged to a new position."},{name:"groupExpandChange",type:"GroupExpandEvent",description:"Emits { groupValue, expanded } when a row group header is toggled."},{name:"rowClick",type:"T",description:"Emits the row object when any data row is clicked. Fires for all click interactions regardless of selectableRows mode."},{name:"masterDetailRowChange",type:"T",description:"Emits the row object when the selected row in a master-detail layout changes."},{name:"activeRowChange",type:"T | null",description:'Emits the active row (or null on deselect) when selectableRows is true or "single". Only one row is active at a time.'},{name:"activeRowsChange",type:"readonly T[]",description:'Emits the full array of active rows when selectableRows is "multi". Users toggle rows by clicking.'}];tableMethodDocs=[{name:"firstPage()",type:"void",description:"Navigate to the first page (offset mode). No-op if already on first page or disabled."},{name:"previousPage()",type:"void",description:"Navigate to the previous page (offset mode). No-op if on first page or disabled."},{name:"nextPage()",type:"void",description:"Navigate to the next page (offset mode). No-op if on last page or disabled."},{name:"lastPage()",type:"void",description:"Navigate to the last page (offset mode). No-op if already on last page or disabled."},{name:"gotoPage(pageNumber)",type:"void",description:"Jump to a specific page by 1-based page number. Bounds-checked and no-op if disabled."},{name:"clearSelection()",type:"void",description:"Deselect all rows and emit an empty selectionChange event."},{name:"sort(field)",type:"void",description:"Programmatically toggle sorting on the given field. Cycles: Ascending -> Descending -> none. Resets to first page in offset mode."},{name:"applyColumnFilter(field, value, operator)",type:"void",description:"Programmatically apply a filter to a column. Replaces any existing filter on the same field and resets to first page."},{name:"removeFilter(field)",type:"void",description:"Remove the active filter for a specific column field and reset to first page."},{name:"clearAllFilters()",type:"void",description:"Remove all active column filters, close filter dropdowns, and reset to first page."},{name:"clearGlobalSearch()",type:"void",description:"Clear the global search term and any pending debounce timeout."},{name:"toggleColumnVisibility(field)",type:"void",description:"Toggle a column between visible/hidden. Respects alwaysVisible and minimum-one-column rules. Persists to localStorage if storageKey is set."},{name:"showAllColumns()",type:"void",description:"Make all columns visible. Persists to localStorage if storageKey is set."},{name:"hideAllColumns()",type:"void",description:"Hide all optional columns, keeping alwaysVisible columns and at least one column shown. Persists to localStorage."},{name:"resetColumnVisibility()",type:"void",description:"Reset column visibility to defaultVisible (if configured) or show all. Persists to localStorage."},{name:"expandAllDetails()",type:"void",description:"Expand all expandable detail rows (expandableDetail mode)."},{name:"collapseAllDetails()",type:"void",description:"Collapse all expandable detail rows."},{name:"expandAllGroups()",type:"void",description:"Expand all row groups (grouping mode)."},{name:"collapseAllGroups()",type:"void",description:"Collapse all row groups."},{name:"expandAllRows()",type:"void",description:"Expand all tree-table rows at every level (tree-table mode)."},{name:"collapseAllRows()",type:"void",description:"Collapse all tree-table rows."},{name:"expandToLevel(level)",type:"void",description:"Expand tree rows down to the given depth (0 = roots only, 1 = roots + first children, etc.)."},{name:"collapseToLevel(level)",type:"void",description:"Collapse tree rows below the given depth, keeping higher levels expanded."},{name:"startEdit(row, field)",type:"void",description:"Programmatically enter inline edit mode for a specific cell."},{name:"confirmEdit()",type:"void",description:"Confirm the currently active inline edit, running validation and emitting cellEdit or cellEditError."},{name:"cancelEdit()",type:"void",description:"Cancel the currently active inline edit without saving, emitting cellEditCancel."},{name:"toggleRowExpand(row)",type:"void",description:"Toggle tree-table row expand/collapse state for a specific row."},{name:"toggleDetailExpand(row)",type:"void",description:"Toggle expandable detail row state for a specific row. Respects expandMode (single/multi)."},{name:"toggleGroupExpand(groupValue)",type:"void",description:"Toggle expand/collapse state of a specific row group by its group value."}];tableContentDocs=[{name:"#rowDetail",type:"TemplateRef<{ $implicit: T }>",description:"Template for the expandable detail row content. The row object is available via let-row. Required when expandableDetail is true."},{name:"#tableFooter",type:"TemplateRef<{ $implicit: readonly T[]; columns: readonly ColumnDefinition<T>[] }>",description:"Custom footer template rendered between the table body and pagination. Receives all data rows and column definitions as context."}];paginationInputDocs=[{name:"paginationOptions",type:"PaginationOptions | null",default:"null",description:"Full pagination configuration object. Controls mode, cursors, page size, size options, and total items."},{name:"totalItems",type:"number",default:"0",description:"Total number of items (fallback when paginationOptions.totalItems is not set)."},{name:"showFirstLastButtons",type:"boolean",default:"true",description:"Show the first-page and last-page navigation buttons (offset mode only)."},{name:"hidePageSize",type:"boolean",default:"false",description:"When true, hides the page-size selector entirely."},{name:"showPageSizeOptions",type:"boolean",default:"true",description:"When true, renders the page-size dropdown."},{name:"disabled",type:"boolean",default:"false",description:"Disables all pagination buttons and the page-size selector."},{name:"pageIndex",type:"number",default:"0",description:"Current 0-based page index (offset mode)."},{name:"pageSize",type:"number",default:"10",description:"Current page size (fallback when paginationOptions.pageSize is not set)."}];paginationOutputDocs=[{name:"pageChange",type:"PageSizeChange",description:"Emits { pageIndex, pageSize } when the user navigates to a different page or changes page size (offset mode)."},{name:"cursorChange",type:"CursorPageChange",description:"Emits { cursor, direction } when the user clicks next/previous in cursor mode."}];filterInputDocs=[{name:"column",type:"ColumnDefinition<T>",description:"The column definition that this filter applies to. Required."},{name:"filterConfig",type:"ColumnFilter<T>",description:"Filter configuration specifying the filter type (text, number, select, multiselect, boolean, date, numberRange, dateRange), available options, and default operator. Required."},{name:"activeFilter",type:"FilterConfig<T>",description:"The currently active filter state for this column, used to pre-populate the filter UI on open."}];filterOutputDocs=[{name:"apply",type:"FilterApplyEvent",description:"Emits { value, operator } when the user clicks Apply or presses Enter. Value is null when the filter is cleared."},{name:"closeFilter",type:"void",description:"Emits when the filter dropdown should close (after apply, clear, or cancel)."}];globalSearchInputDocs=[{name:"searchTerm",type:"string",default:"''",description:"Current search term value, used for controlled binding."},{name:"placeholder",type:"string",default:"'Search all columns...'",description:"Placeholder text displayed inside the search input."},{name:"showIcon",type:"boolean",default:"true",description:"Show the magnifying glass icon before the input."},{name:"showClearButton",type:"boolean",default:"true",description:"Show the X clear button when a search term is present."},{name:"hasSearchTerm",type:"boolean",default:"false",description:"Whether a search term is currently active. Controls clear button visibility."}];globalSearchOutputDocs=[{name:"searchChange",type:"string",description:"Emits the new search term on every keystroke."},{name:"clear",type:"void",description:"Emits when the user clicks the clear (X) button."}];colVisInputDocs=[{name:"columns",type:"ColumnDefinition<T>[]",description:"Array of all column definitions to display in the visibility toggle dropdown. Required."},{name:"visibilityState",type:"Map<string, boolean>",description:"Map of field name to visibility boolean. Columns not in the map default to visible. Required."},{name:"alwaysVisibleColumns",type:"Set<string>",default:"new Set()",description:"Set of field names that cannot be hidden. Shown with a lock icon in the dropdown."}];colVisOutputDocs=[{name:"toggleColumn",type:"string",description:"Emits the field name when a column checkbox is toggled."},{name:"showAll",type:"void",description:'Emits when the "Show All" quick action is clicked.'},{name:"hideAll",type:"void",description:'Emits when the "Hide All" quick action is clicked.'},{name:"resetEmitter",type:"void",description:'Emits when the "Reset" quick action is clicked to restore default visibility.'}];builderFieldConfigDocs=[{name:"visible",type:"StringKey<T>[]",description:"Columns to display, in order. Each entry maps to a property key on the data object."},{name:"hidden",type:"StringKey<T>[]",default:"[]",description:"Columns to exclude from the table."},{name:"headers",type:"Partial<Record<StringKey<T>, string>>",description:"Custom header labels. Keys not specified default to the field name."},{name:"formatters",type:"Partial<Record<StringKey<T>, Formatter<T>>>",description:"Cell formatters per column. Can be a function (value, row) => string, or a PipeFormatter tuple like ['currency', 'USD']."},{name:"fallbacks",type:"Partial<Record<StringKey<T>, string>>",description:"Fallback text displayed when a cell value is null or undefined."},{name:"hasSelection",type:"boolean",default:"false",description:"Show a checkbox column for row selection."},{name:"hasActions",type:"boolean",default:"false",description:"Show an actions column with per-row action buttons."},{name:"selectableRows",type:"boolean | 'single' | 'multi'",default:"false",description:"Enable click-to-highlight rows. true or 'single' highlights one row at a time; 'multi' allows toggling multiple rows."},{name:"selectedRowClass",type:"string",default:"'bg-primary/10'",description:"CSS class applied to the active/selected row."},{name:"rowClass",type:"(row: T) => Record<string, boolean>",description:"Callback to apply conditional CSS classes per row. Returns an ngClass-style object."},{name:"actions",type:"TableAction<T>[]",description:"Array of per-row action button definitions (type, label, icon, action handler, etc.)."},{name:"bulkActions",type:"TableBulkAction<T>[]",description:"Bulk action buttons shown when rows are selected. Can render as dropdown with dropdownOptions."},{name:"filters",type:"ColumnFilter<T>[]",description:"Column filter definitions. Each entry specifies field, type, options, and default operator."},{name:"enableFiltering",type:"boolean",description:"Master toggle for enabling/disabling column filtering."},{name:"globalSearch",type:"GlobalSearchConfig<T>",description:"Global search configuration. Set enabled: true to activate the search bar above the table."},{name:"columnVisibility",type:"ColumnVisibilityConfig",description:"Column visibility toggle configuration. Allows users to show/hide columns via a dropdown."},{name:"treeTable",type:"TreeTableConfig<T>",description:"Tree table configuration for hierarchical data with expand/collapse, indent guides, and checkbox cascade."},{name:"stickyColumns",type:"{ stickySelection?: boolean; stickyActions?: boolean }",description:"Pin the selection checkbox and/or actions column during horizontal scroll."},{name:"enableColumnResizing",type:"boolean",default:"false",description:"Enable column resize handles on column borders."},{name:"columnWidths",type:"Partial<Record<StringKey<T>, number>>",description:"Initial column widths in pixels."},{name:"resizeMode",type:"'fit' | 'expand'",default:"'expand'",description:"'fit' adjusts the neighboring column; 'expand' changes the table width."},{name:"virtualScroll",type:"VirtualScrollConfig",description:"Virtual scrolling configuration for large datasets. Pagination is automatically hidden."},{name:"enableInlineEditing",type:"boolean",default:"false",description:"Enable double-click inline cell editing."},{name:"cellEditors",type:"Partial<Record<StringKey<T>, CellEditorConfig>>",description:"Per-field editor configuration (type, options, validator)."},{name:"showFooter",type:"boolean",default:"false",description:"Show a legacy single-row footer with aggregate values."},{name:"footers",type:"Partial<Record<StringKey<T>, AggregateFunction | FooterConfig<T>>>",description:"Legacy single-row footer aggregates per column. Use footerRows for multi-row footers."},{name:"footerRows",type:"FooterRowDef<T>[]",description:"Multi-row footer definitions. Each entry defines one footer row with per-column aggregates."},{name:"expandableDetail",type:"boolean",default:"false",description:"Enable expandable detail rows. Requires a #rowDetail template in the table content."},{name:"expandMode",type:"'single' | 'multi'",default:"'multi'",description:"'single' collapses others when one row expands; 'multi' allows many expanded."},{name:"enableKeyboardNavigation",type:"boolean",default:"false",description:"Enable arrow key cell navigation, Enter to edit, Space to toggle selection."},{name:"enableColumnReorder",type:"boolean",default:"false",description:"Enable drag-and-drop column header reordering."},{name:"enableRowReorder",type:"boolean",default:"false",description:"Enable drag-and-drop row reordering."},{name:"showDragHandle",type:"boolean",default:"true",description:"Show a grip icon column for row drag-and-drop reordering."},{name:"grouping",type:"GroupConfig<T>",description:"Row grouping configuration with group headers, caption aggregates, and multi-row group footers."},{name:"childGrid",type:"ChildGridConfig<T>",description:"Hierarchy grid configuration for expandable nested child tables."},{name:"masterDetail",type:"MasterDetailConfig<T>",description:"Master-detail layout configuration for stacked master/detail tables."}];builderPaginationDocs=[{name:"mode",type:"'cursor' | 'offset'",description:"Pagination strategy. 'offset' uses page numbers; 'cursor' uses opaque tokens for next/prev navigation."},{name:"pageSize",type:"number",description:"Number of items displayed per page."},{name:"pageSizeOptions",type:"number[]",default:"[5, 10, 25, 50, 100]",description:"Dropdown options for changing the page size."},{name:"totalItems",type:"number",description:"Total item count used for calculating total pages in offset mode."},{name:"nextCursor",type:"string | null",description:"Next page cursor token (cursor mode only). Set to null when no more pages."},{name:"prevCursor",type:"string | null",description:"Previous page cursor token (cursor mode only). Set to null on the first page."},{name:"showQuickJumper",type:"boolean",default:"false",description:'Show a "go to page" input for quick navigation.'},{name:"showSizeChanger",type:"boolean",default:"false",description:"Show the page size changer dropdown."},{name:"showTotal",type:"boolean | ((total, range) => string)",description:"Show the total item count. Can be a boolean or a function returning a custom string."}];filterTypeEnumDocs=[{name:"text",type:"FilterType",description:"Free-text input filter with string operators (contains, startsWith, endsWith, equals, etc.)."},{name:"number",type:"FilterType",description:"Numeric input filter with comparison operators (equals, gt, lt, gte, lte, between)."},{name:"date",type:"FilterType",description:"Date picker filter with date comparison operators."},{name:"select",type:"FilterType",description:"Single-select dropdown filter. Requires options array."},{name:"multiselect",type:"FilterType",description:"Multi-select dropdown filter. Uses 'in' operator by default."},{name:"boolean",type:"FilterType",description:"Toggle/checkbox filter for boolean fields."},{name:"dateRange",type:"FilterType",description:"Date range picker filter. Uses 'between' operator."},{name:"numberRange",type:"FilterType",description:"Numeric range filter with min/max inputs. Uses 'between' operator."}];filterOperatorEnumDocs=[{name:"equals",type:"FilterOperator",description:"Exact match comparison."},{name:"notEquals",type:"FilterOperator",description:"Not equal comparison."},{name:"contains",type:"FilterOperator",description:"String contains (case-insensitive by default)."},{name:"notContains",type:"FilterOperator",description:"String does not contain."},{name:"startsWith",type:"FilterOperator",description:"String starts with the given value."},{name:"endsWith",type:"FilterOperator",description:"String ends with the given value."},{name:"gt",type:"FilterOperator",description:"Greater than (numeric/date)."},{name:"lt",type:"FilterOperator",description:"Less than (numeric/date)."},{name:"gte",type:"FilterOperator",description:"Greater than or equal (numeric/date)."},{name:"lte",type:"FilterOperator",description:"Less than or equal (numeric/date)."},{name:"between",type:"FilterOperator",description:"Value is between two bounds (inclusive). Used by dateRange and numberRange."},{name:"in",type:"FilterOperator",description:"Value is one of the given set. Used by multiselect filter."},{name:"notIn",type:"FilterOperator",description:"Value is not in the given set."},{name:"isEmpty",type:"FilterOperator",description:"Field is null, undefined, or empty string."},{name:"isNotEmpty",type:"FilterOperator",description:"Field has a non-empty value."}];columnFilterInterfaceDocs=[{name:"type",type:"FilterType",description:"UI widget type for the filter (text, number, date, select, multiselect, boolean, dateRange, numberRange)."},{name:"field",type:"StringKey<T>",description:"Column field this filter applies to."},{name:"operators",type:"FilterOperator[]",description:"Available operators the user can choose from. Defaults vary by filter type."},{name:"options",type:"FilterOption[]",description:"Options for select and multiselect filter types. Each option has a label and value."},{name:"placeholder",type:"string",description:"Placeholder text for the filter input."},{name:"defaultOperator",type:"FilterOperator",description:"Initial operator selected when the filter is opened."}];globalSearchConfigDocs=[{name:"enabled",type:"boolean",description:"Enable the global search feature. Shows a search bar above the table."},{name:"mode",type:"GlobalSearchMode",default:"'contains'",description:"Search strategy: 'contains', 'startsWith', 'exact', or 'fuzzy' (Fuse.js powered)."},{name:"placeholder",type:"string",default:"'Search all columns...'",description:"Placeholder text in the search input."},{name:"debounceTime",type:"number",default:"300",description:"Debounce delay in milliseconds before search is executed."},{name:"caseSensitive",type:"boolean",default:"false",description:"Enable case-sensitive search. Only applies to non-fuzzy modes."},{name:"showIcon",type:"boolean",default:"true",description:"Show the magnifying glass icon in the search input."},{name:"showClearButton",type:"boolean",default:"true",description:"Show the clear (X) button when a search term is present."},{name:"excludeFields",type:"StringKey<T>[]",description:"Fields to exclude from the global search."},{name:"customSearch",type:"(row: T, searchTerm: string) => boolean",description:"Custom search predicate. When provided, overrides the built-in search logic."},{name:"fuseOptions",type:"IFuseOptions<T>",description:"Fuse.js configuration options for fuzzy search mode."}];filteringExampleCode=`import { createTable } from '@hakistack/ng-daisyui';

const config = createTable<User>({
  visible: ['id', 'name', 'email', 'role', 'department', 'status'],
  // Column-specific filters
  filters: [
    {
      field: 'role',
      type: 'select',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
        { label: 'Viewer', value: 'viewer' },
      ],
    },
    {
      field: 'status',
      type: 'select',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
      ],
    },
    {
      field: 'department',
      type: 'multiselect',
      options: [
        { label: 'Engineering', value: 'Engineering' },
        { label: 'Marketing', value: 'Marketing' },
      ],
    },
  ],
  // Global search across all columns
  globalSearch: {
    enabled: true,
    mode: 'fuzzy',
    placeholder: 'Search users...',
    debounceTime: 300,
    excludeFields: ['id'],
  },
});

// Template
<hk-table
  [data]="users()"
  [config]="config"
  (filterChange)="onFilter($event)"
  (globalSearchChange)="onSearch($event)"
/>`;fieldConfigType=`// FieldConfig<T> \u2014 passed to createTable()
interface FieldConfig<T> {
  visible: StringKey<T>[];               // Columns to display (order matters)
  hidden?: StringKey<T>[];               // Columns to exclude
  headers?: Partial<Record<StringKey<T>, string>>;       // Custom header labels
  formatters?: Partial<Record<StringKey<T>, Formatter<T>>>;  // Cell formatters (fn or PipeFormatter)
  fallbacks?: Partial<Record<StringKey<T>, string>>;     // Fallback text for null/undefined values
  hasSelection?: boolean;                // Show checkbox column
  hasActions?: boolean;                  // Show actions column
  selectableRows?: boolean | 'single' | 'multi';  // Click-to-highlight rows
  selectedRowClass?: string;             // CSS class for active rows (default: 'bg-primary/10')
  rowClass?: (row: T) => Record<string, boolean>;  // Conditional per-row CSS classes
  clearSelectionText?: string;           // Custom "Clear selection" label
  selectionHintText?: string;            // Custom selection hint text
  actions?: TableAction<T>[];            // Per-row action buttons
  bulkActions?: TableBulkAction<T>[];    // Bulk action buttons (shown when rows selected)
  filters?: ColumnFilter<T>[];           // Column filter definitions
  enableFiltering?: boolean;             // Master toggle for column filtering
  globalSearch?: GlobalSearchConfig<T>;  // Global search configuration
  columnVisibility?: ColumnVisibilityConfig;  // Column show/hide toggle
  treeTable?: TreeTableConfig<T>;        // Tree table (hierarchical data) configuration
  stickyColumns?: {
    stickySelection?: boolean;           // Pin checkbox column (default: true)
    stickyActions?: boolean;             // Pin actions column (default: true)
  };
  enableColumnResizing?: boolean;        // Enable column resize handles
  columnWidths?: Partial<Record<StringKey<T>, number>>;  // Initial column widths (px)
  resizeMode?: 'fit' | 'expand';         // 'fit' adjusts neighbor, 'expand' grows table
  virtualScroll?: VirtualScrollConfig;   // Virtual scrolling for large datasets
  enableInlineEditing?: boolean;         // Enable double-click cell editing
  cellEditors?: Partial<Record<StringKey<T>, CellEditorConfig>>;  // Editor config per field
  showFooter?: boolean;                  // Show footer row with aggregates
  footers?: Partial<Record<StringKey<T>, AggregateFunction | FooterConfig<T>>>;  // Legacy single-row footer
  footerRows?: FooterRowDef<T>[];        // Multi-row footer definitions
  expandableDetail?: boolean;            // Enable expandable detail rows
  expandMode?: 'single' | 'multi';      // One or many expanded details (default: 'multi')
  enableKeyboardNavigation?: boolean;    // Arrow key cell navigation
  enableColumnReorder?: boolean;         // Drag-and-drop column reordering
  enableRowReorder?: boolean;            // Drag-and-drop row reordering
  showDragHandle?: boolean;              // Show grip icon for row reorder (default: true)
  grouping?: GroupConfig<T>;             // Row grouping configuration
  childGrid?: ChildGridConfig<T>;        // Hierarchy grid (expandable child tables)
  masterDetail?: MasterDetailConfig<T>;  // Master-detail layout (stacked tables)
}`;columnDefinitionType=`// ColumnDefinition<T> \u2014 generated by createTable(), can also be customized
interface ColumnDefinition<T> {
  field: StringKey<T>;       // Property key on the data object
  header: string;            // Display header text
  format?: (value: unknown, row: T) => string | Observable<string>;  // Cell formatter
  fallback?: string;         // Fallback for null/undefined cell values
  filter?: ColumnFilter<T>;  // Inline filter config (alternative to FieldConfig.filters)
  sticky?: 'start' | 'end'; // Pin column during horizontal scroll
  resizable?: boolean;       // Whether this column can be resized (default: true)
  minWidth?: number;         // Minimum width in px during resize
  maxWidth?: number;         // Maximum width in px during resize
  editable?: boolean;        // Whether this column supports inline editing
  editType?: 'text' | 'number' | 'select' | 'date' | 'toggle';  // Editor widget type
  editOptions?: { label: string; value: unknown }[];  // Options for select editor
  editValidator?: (value: unknown, row: T) => boolean | string;  // Validation fn
  footer?: (data: readonly T[]) => string | number;  // Legacy footer aggregate fn
  reorderable?: boolean;     // Whether this column can be reordered (default: true)
}`;paginationOptionsType=`// PaginationOptions
interface PaginationOptions {
  mode: 'cursor' | 'offset';            // Pagination strategy
  nextCursor?: string | null;            // Next page cursor token (cursor mode)
  prevCursor?: string | null;            // Previous page cursor token (cursor mode)
  pageSize: number;                      // Items per page
  pageSizeOptions?: number[];            // Dropdown options (default: [5, 10, 25, 50, 100])
  totalItems?: number;                   // Total item count for page calculations
  showQuickJumper?: boolean;             // Show "go to page" input
  showSizeChanger?: boolean;             // Show page size changer
  showTotal?: boolean | ((total: number, range: [number, number]) => string);
}`;filterTypes=`// Filter Types
type FilterType = 'text' | 'number' | 'date' | 'select'
  | 'multiselect' | 'boolean' | 'dateRange' | 'numberRange';

type FilterOperator = 'equals' | 'notEquals' | 'contains' | 'notContains'
  | 'startsWith' | 'endsWith' | 'gt' | 'lt' | 'gte' | 'lte'
  | 'between' | 'in' | 'notIn' | 'isEmpty' | 'isNotEmpty';

interface ColumnFilter<T> {
  type: FilterType;                      // UI widget type
  field: StringKey<T>;                   // Column field to filter
  operators?: FilterOperator[];          // Allowed operators
  options?: FilterOption[];              // Options for select/multiselect
  placeholder?: string;                  // Input placeholder text
  defaultOperator?: FilterOperator;      // Initial operator
}

interface FilterConfig<T> {
  field: StringKey<T>;                   // Filtered field
  value: unknown;                        // Current filter value
  operator: FilterOperator;              // Active operator
  type?: FilterType;                     // Filter type
}

interface FilterChange<T> {
  field: string;                         // Changed field ('' for clearAll)
  value: unknown;                        // New value (null for clear)
  operator: FilterOperator;              // Applied operator
  filters: FilterConfig<T>[];            // All active filters
}

interface FilterOption {
  label: string;
  value: unknown;
}`;globalSearchConfigType=`// GlobalSearchConfig<T>
type GlobalSearchMode = 'contains' | 'startsWith' | 'exact' | 'fuzzy';

interface GlobalSearchConfig<T> {
  enabled: boolean;                      // Enable global search
  mode?: GlobalSearchMode;               // Search strategy (default: 'contains')
  placeholder?: string;                  // Input placeholder
  debounceTime?: number;                 // Debounce in ms (default: 300)
  caseSensitive?: boolean;               // Case-sensitive (default: false, N/A for fuzzy)
  showIcon?: boolean;                    // Show search icon
  showClearButton?: boolean;             // Show clear button
  excludeFields?: StringKey<T>[];        // Fields to skip during search
  customSearch?: (row: T, searchTerm: string) => boolean;  // Custom predicate
  fuseOptions?: IFuseOptions<T>;         // Fuse.js config for fuzzy mode
}

interface GlobalSearchChange {
  searchTerm: string;
  mode: GlobalSearchMode;
}`;columnVisibilityConfigType=`// ColumnVisibilityConfig
interface ColumnVisibilityConfig {
  enabled?: boolean;                     // Enable column visibility toggle
  storageKey?: string;                   // localStorage key for persistence
  defaultVisible?: string[];             // Default visible columns (all if omitted)
  alwaysVisible?: string[];              // Columns that cannot be hidden
}`;treeTableConfigType=`// TreeTableConfig<T>
interface TreeTableConfig<T> {
  enabled: boolean;                      // Enable tree table mode
  childrenProperty?: string;             // Property holding children (default: 'children')
  initialExpandedKeys?: string[];        // Row keys to expand on init
  expandAll?: boolean;                   // Expand all on init (default: false)
  getRowKey?: (row: T) => string;        // Custom row key function
  indentSize?: number;                   // Indent px per level (default: 24)
  treeColumnIndex?: number;              // Which visible[] column shows the toggle (default: 0)
  showIndentGuides?: boolean;            // Show vertical indent guide lines (default: true)
  filterHierarchyMode?: 'ancestors' | 'descendants' | 'both' | 'none';  // Filter behavior (default: 'ancestors')
  initialExpandLevel?: number;           // Auto-expand to depth (1 = roots expanded)
  checkboxCascade?: 'none' | 'downward' | 'upward' | 'both';  // Checkbox selection cascade (default: 'none')
}`;virtualScrollConfigType=`// VirtualScrollConfig
interface VirtualScrollConfig {
  enabled: boolean;                      // Enable virtual scrolling
  itemHeight: number;                    // Row height in px (required for CDK)
  viewportHeight: string;               // Viewport height CSS value (e.g. '400px', '60vh')
  bufferSize?: number;                   // Extra items above/below viewport
}`;groupConfigType=`// GroupConfig<T>
interface GroupConfig<T> {
  groupBy: StringKey<T>;                 // Field to group rows by
  aggregates?: Partial<Record<StringKey<T>, AggregateFunction>>;  // Legacy group footer aggregates
  initiallyExpanded?: boolean;           // Groups expanded on init (default: true)
  showGroupFooter?: boolean;             // Show legacy aggregate footer per group
  groupHeaderLabel?: (groupValue: unknown, rows: T[]) => string;  // Custom group header text
  groupSortFn?: (a: unknown, b: unknown) => number;  // Custom group ordering
  captionAggregates?: FooterRowDef<T>;   // Inline aggregates in group header row
  groupFooterRows?: FooterRowDef<T>[];   // Multi-row footer per group (column-aligned)
}

interface GroupExpandEvent {
  groupValue: unknown;
  expanded: boolean;
}`;childGridConfigType=`// ChildGridConfig<TParent> \u2014 Hierarchy Grid (expandable nested tables)
interface ChildGridConfig<TParent> {
  config: FieldConfiguration<any>;       // Column config for the child table (from createTable)
  childDataProperty?: string;            // Property on parent holding child array
  childDataFn?: (parentRow: TParent) => readonly unknown[];  // Function to resolve child data
  pagination?: PaginationOptions;        // Child table pagination
  expandMode?: 'single' | 'multi';      // One or many expanded (default: 'multi')
  bordered?: boolean;                    // Show left border for hierarchy (default: true)
  containerClass?: string;               // Additional CSS class for child container
}`;masterDetailConfigType=`// MasterDetailConfig<TParent> \u2014 stacked master/detail tables
interface MasterDetailConfig<TParent> {
  config: FieldConfiguration<any>;       // Column config for the detail table (from createTable)
  detailDataProperty?: string;           // Property on master holding detail array
  detailDataFn?: (masterRow: TParent) => readonly unknown[];  // Function to resolve detail data
  pagination?: PaginationOptions;        // Detail table pagination
  headerText?: string | ((masterRow: TParent) => string);  // Detail section header
  autoSelectFirst?: boolean;             // Select first row on data change (default: true)
  containerClass?: string;               // Additional CSS class for detail container
}`;actionTypes=`// TableAction<T> \u2014 per-row action button
type ActionType = 'view' | 'edit' | 'delete' | 'upload'
  | 'download' | 'print' | (string & {});

interface TableAction<T> {
  type: ActionType;                      // Action identifier (determines default styling)
  label: string;                         // Button text
  action: (row: T) => void;             // Click handler
  hidden?: (row: T) => boolean;          // Conditionally hide per row
  disabled?: (row: T) => boolean;        // Conditionally disable per row
  icon?: IconName;                       // Lucide icon name
  tooltip?: string | ((row: T) => string);  // Tooltip text
  buttonClass?: string;                  // Additional CSS class
  buttonClasses?: string[];              // Additional CSS classes array
  buttonStyle?: CSSProperties;           // Inline styles
}

// TableBulkAction<T> \u2014 shown when rows are selected
interface TableBulkAction<T> {
  type: ActionType;
  label: string;
  action: (rows: T[], option?: BulkActionDropdownOption) => void;
  hidden?: (rows: T[]) => boolean;
  disabled?: (rows: T[]) => boolean;
  icon?: IconName;
  tooltip?: string | ((rows: T[]) => string);
  buttonClass?: string;
  buttonClasses?: string[];
  buttonStyle?: CSSProperties;
  dropdownOptions?: BulkActionDropdownOption[];  // Render as dropdown
  useDefaultExportOptions?: boolean;     // Auto-generate CSV/Excel/PDF/JSON options
}

interface BulkActionDropdownOption {
  label: string;
  value: string;
  icon?: IconName;
  disabled?: boolean;
}`;eventTypes=`// Event Types
interface SortChange {
  field: string;
  direction: 'Ascending' | 'Descending' | '';
}

interface PageSizeChange {
  pageIndex: number;     // 0-based page index
  pageSize: number;      // Items per page
}

interface CursorPageChange {
  cursor: string;        // Opaque cursor token
  direction: 'next' | 'prev';
}

interface ColumnResizeEvent {
  field: string;
  width: number;
  previousWidth: number;
}

interface CellEditEvent<T> {
  row: T;
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

interface CellEditErrorEvent<T> {
  row: T;
  field: string;
  value: unknown;
  error: string;         // Validation error message
}

interface RowExpandEvent<T> {
  row: T;
  expanded: boolean;
}

interface ColumnReorderEvent {
  previousIndex: number;
  currentIndex: number;
  columns: string[];     // New column order
}

interface RowReorderEvent<T> {
  row: T;
  previousIndex: number;
  currentIndex: number;
  data: readonly T[];    // Full data array after reorder
}`;footerTypes=`// Footer Types
interface FooterRowDef<T> {
  columns: Partial<Record<StringKey<T>, AggregateFunction | FooterCellDef<T>>>;
  class?: string;                        // CSS class for the footer row
}

interface FooterCellDef<T> {
  fn: AggregateFunction;                 // Aggregate function to compute
  label?: string;                        // Label prefix (default: auto from fn)
  field?: StringKey<T>;                  // Aggregate a different field than the column
  format?: (value: number) => string;    // Custom value formatter
  class?: string;                        // Per-cell CSS class
  custom?: (data: readonly T[]) => string | number;  // Full override
}

interface FooterConfig<T> {
  fn: AggregateFunction;
  label?: string;
  field?: StringKey<T>;
}

// CellEditorConfig \u2014 per-field editor
interface CellEditorConfig {
  type: 'text' | 'number' | 'select' | 'date' | 'toggle';
  options?: { label: string; value: unknown }[];
  validator?: (value: unknown, row: unknown) => boolean | string;
}`;aggregateFunctionType=`// AggregateFunction
type AggregateFunction =
  | 'sum'            // Numeric sum
  | 'avg'            // Numeric average
  | 'count'          // Row count
  | 'min'            // Minimum value
  | 'max'            // Maximum value
  | 'trueCount'      // Count of truthy values
  | 'falseCount'     // Count of falsy values
  | 'median'         // Numeric median
  | 'distinctCount'; // Count of unique values`;static \u0275fac=function(e){return new(e||l)};static \u0275cmp=F({type:l,selectors:[["app-table-demo"]],decls:65,vars:60,consts:[["rowDetail",""],["title","Table","description","Enterprise-grade data table with sorting, filtering, pagination, and more","icon","Table","category","Data Display","importName","TableComponent, createTable"],["examples",""],["role","tablist",1,"tabs","tabs-box","tabs-boxed","w-fit","flex-wrap"],["role","tab",1,"tab",3,"click"],["title","Basic Table","description","Simple table with sorting",3,"codeExample"],["title","Sticky Columns","description","Pin columns to start/end during horizontal scroll. Selection and actions columns auto-stick.",3,"codeExample"],["title","Resizable Columns","description","Drag column borders to resize. Supports min/max width constraints.",3,"codeExample"],["title","Virtual Scrolling","description","Efficiently render large datasets with CDK virtual scroll. Pagination is disabled.",3,"codeExample"],["title","Inline Cell Editing","description","Double-click a cell to edit. Supports text, number, select, and toggle editors.",3,"codeExample"],["title","Expandable Row Detail","description","Click the chevron to expand a row and reveal additional detail content.",3,"codeExample"],["title","Row Grouping","description","Group rows by a field with caption aggregates in headers and column-aligned multi-row group footers.",3,"codeExample"],["title","Reorderable Columns & Rows","description","Drag column headers to reorder columns. Drag row handles to reorder rows.",3,"codeExample"],["title","Keyboard Navigation","description","Use arrow keys to navigate cells. Enter to edit or expand. Space to toggle selection. Escape to clear focus.",3,"codeExample"],["title","Hierarchy Grid","description","Expanding a parent row reveals a fully-featured nested child table with its own sorting and pagination. Multi-level nesting is supported.",3,"codeExample"],["title","Master-Detail Grid","description","Click a row in the master table to display its related detail data in a separate table below. The first row is auto-selected on load.",3,"codeExample"],["title","Nested Master-Detail","description","The detail table can itself be a master with its own detail below it, enabling multi-level drill-down. Click an employee to see their orders, then click an order to see its line items.",3,"codeExample"],["api",""],["role","tablist",1,"tabs","tabs-box","tabs-boxed"],[1,"space-y-6"],[3,"sortChange","data","config"],["title","Full Featured Table","description","Selection, actions, filters, global search, pagination",3,"codeExample"],[3,"selectionChange","sortChange","filterChange","globalSearchChange","pageChange","data","config","paginationOptions"],[1,"alert","alert-info"],["name","Info",3,"size"],["title","Single Selectable Row","description","Click any row to highlight it. Click again to deselect. Useful for visual guidance \u2014 the active row gets a primary tint. Supports conditional rowClass for per-row styling.",3,"codeExample"],[3,"activeRowChange","data","config"],["title","Multi Selectable Rows","description","Click multiple rows to highlight them. Click a highlighted row to deselect it. Great for batch visual guidance without checkbox columns.",3,"codeExample"],[3,"activeRowsChange","data","config"],["name","MousePointerClick",3,"size"],[2,"max-width","600px"],[3,"data","config"],[3,"columnResize","data","config"],[3,"cellEdit","data","config"],["title","Multi-Row Summary Footer","description","Display multiple footer rows with different aggregates per row (totals, averages, min/max).",3,"codeExample"],["title","Colspan Footer Rows","description","Footer cells that span multiple columns. Use the cells array instead of columns to freely control layout.",3,"codeExample"],["title","Custom Footer Template (hkFooter)","description","Full layout freedom inside the footer using an Angular template. The component wraps your content in a full-width row automatically.",3,"codeExample"],["hkFooter",""],[1,"flex","items-center","justify-between","px-2","py-1"],[1,"flex","items-center","gap-2","text-sm","text-base-content/70"],["name","Users",1,"h-4","w-4"],[1,"flex","items-center","gap-4"],[1,"badge","badge-success","badge-sm"],[1,"badge","badge-info","badge-sm"],[3,"detailExpansionChange","data","config"],[1,"grid","grid-cols-2","gap-4"],[1,"font-semibold","mb-2"],[1,"text-sm"],[3,"groupExpandChange","data","config"],[3,"columnReorder","rowReorder","data","config"],[3,"cellEdit","selectionChange","data","config","paginationOptions"],["title","hk-table Inputs",3,"entries"],["title","Outputs",3,"entries"],["title","Public Methods",3,"entries"],["title","Content Projection",3,"entries"],[1,"text-2xl","font-bold","mb-1"],[1,"text-base-content/70","text-sm","mb-4"],[1,"text-xs"],["title","TablePaginationComponent \u2014 Inputs",3,"entries"],["title","TablePaginationComponent \u2014 Outputs",3,"entries"],[1,"divider"],["title","TableFilterComponent \u2014 Inputs",3,"entries"],["title","TableFilterComponent \u2014 Outputs",3,"entries"],["title","TableGlobalSearchComponent \u2014 Inputs",3,"entries"],["title","TableGlobalSearchComponent \u2014 Outputs",3,"entries"],["title","TableColumnVisibilityComponent \u2014 Inputs",3,"entries"],["title","TableColumnVisibilityComponent \u2014 Outputs",3,"entries"],[1,"card","card-border","card-bordered","bg-base-100"],[1,"card-body","gap-3"],[1,"card-title","text-lg"],[1,"text-sm","text-base-content/70"],[3,"code"],["title","FieldConfig Properties (Column Definition)",3,"entries"],["title","PaginationOptions",3,"entries"],["title","FilterType Enum Values",3,"entries"],["title","FilterOperator Enum Values",3,"entries"],["title","ColumnFilter Interface",3,"entries"],["title","GlobalSearchConfig Interface",3,"entries"]],template:function(e,o){e&1&&(a(0,"app-demo-page",1)(1,"div",2)(2,"div",3)(3,"button",4),u("click",function(){return o.activeTab.set("basic")}),r(4,"Basic"),n(),a(5,"button",4),u("click",function(){return o.activeTab.set("full")}),r(6,"Full Featured"),n(),a(7,"button",4),u("click",function(){return o.activeTab.set("selectableRow")}),r(8," Selectable Row "),n(),a(9,"button",4),u("click",function(){return o.activeTab.set("sticky")}),r(10,"Sticky"),n(),a(11,"button",4),u("click",function(){return o.activeTab.set("resizable")}),r(12," Resizable "),n(),a(13,"button",4),u("click",function(){return o.activeTab.set("virtualScroll")}),r(14," Virtual Scroll "),n(),a(15,"button",4),u("click",function(){return o.activeTab.set("editable")}),r(16," Editable "),n(),a(17,"button",4),u("click",function(){return o.activeTab.set("footer")}),r(18,"Footer"),n(),a(19,"button",4),u("click",function(){return o.activeTab.set("expandable")}),r(20," Expandable "),n(),a(21,"button",4),u("click",function(){return o.activeTab.set("grouped")}),r(22,"Grouped"),n(),a(23,"button",4),u("click",function(){return o.activeTab.set("reorderable")}),r(24," Reorderable "),n(),a(25,"button",4),u("click",function(){return o.activeTab.set("keyboard")}),r(26," Keyboard "),n(),a(27,"button",4),u("click",function(){return o.activeTab.set("hierarchy")}),r(28," Hierarchy "),n(),a(29,"button",4),u("click",function(){return o.activeTab.set("masterDetail")}),r(30," Master-Detail "),n(),a(31,"button",4),u("click",function(){return o.activeTab.set("nestedMasterDetail")}),r(32," Nested Master-Detail "),n()(),g(33,J,2,3,"app-doc-section",5),g(34,Q,3,5),g(35,ee,6,8),g(36,te,3,3,"app-doc-section",6),g(37,ie,2,3,"app-doc-section",7),g(38,ne,2,3,"app-doc-section",8),g(39,ae,2,3,"app-doc-section",9),g(40,re,7,9),g(41,se,4,3,"app-doc-section",10),g(42,de,2,3,"app-doc-section",11),g(43,ce,2,3,"app-doc-section",12),g(44,pe,2,4,"app-doc-section",13),g(45,me,2,3,"app-doc-section",14),g(46,ue,2,3,"app-doc-section",15),g(47,ge,2,3,"app-doc-section",16),n(),a(48,"div",17)(49,"div",18)(50,"button",4),u("click",function(){return o.apiTab.set("hk-table")}),r(51,"hk-table"),n(),a(52,"button",4),u("click",function(){return o.apiTab.set("sub-components")}),r(53," Sub-Components "),n(),a(54,"button",4),u("click",function(){return o.apiTab.set("builder")}),r(55,"Builder"),n(),a(56,"button",4),u("click",function(){return o.apiTab.set("filtering")}),r(57,"Filtering"),n(),a(58,"button",4),u("click",function(){return o.apiTab.set("types")}),r(59,"Types"),n()(),g(60,be,5,4,"div",19),g(61,fe,65,8,"div",19),g(62,ye,19,3,"div",19),g(63,he,10,5,"div",19),g(64,ve,76,15,"div",19),n()()),e&2&&(i(3),y("tab-active",o.activeTab()==="basic"),i(2),y("tab-active",o.activeTab()==="full"),i(2),y("tab-active",o.activeTab()==="selectableRow"),i(2),y("tab-active",o.activeTab()==="sticky"),i(2),y("tab-active",o.activeTab()==="resizable"),i(2),y("tab-active",o.activeTab()==="virtualScroll"),i(2),y("tab-active",o.activeTab()==="editable"),i(2),y("tab-active",o.activeTab()==="footer"),i(2),y("tab-active",o.activeTab()==="expandable"),i(2),y("tab-active",o.activeTab()==="grouped"),i(2),y("tab-active",o.activeTab()==="reorderable"),i(2),y("tab-active",o.activeTab()==="keyboard"),i(2),y("tab-active",o.activeTab()==="hierarchy"),i(2),y("tab-active",o.activeTab()==="masterDetail"),i(2),y("tab-active",o.activeTab()==="nestedMasterDetail"),i(2),b(o.activeTab()==="basic"?33:-1),i(),b(o.activeTab()==="full"?34:-1),i(),b(o.activeTab()==="selectableRow"?35:-1),i(),b(o.activeTab()==="sticky"?36:-1),i(),b(o.activeTab()==="resizable"?37:-1),i(),b(o.activeTab()==="virtualScroll"?38:-1),i(),b(o.activeTab()==="editable"?39:-1),i(),b(o.activeTab()==="footer"?40:-1),i(),b(o.activeTab()==="expandable"?41:-1),i(),b(o.activeTab()==="grouped"?42:-1),i(),b(o.activeTab()==="reorderable"?43:-1),i(),b(o.activeTab()==="keyboard"?44:-1),i(),b(o.activeTab()==="hierarchy"?45:-1),i(),b(o.activeTab()==="masterDetail"?46:-1),i(),b(o.activeTab()==="nestedMasterDetail"?47:-1),i(3),y("tab-active",o.apiTab()==="hk-table"),i(2),y("tab-active",o.apiTab()==="sub-components"),i(2),y("tab-active",o.apiTab()==="builder"),i(2),y("tab-active",o.apiTab()==="filtering"),i(2),y("tab-active",o.apiTab()==="types"),i(2),b(o.apiTab()==="hk-table"?60:-1),i(),b(o.apiTab()==="sub-components"?61:-1),i(),b(o.apiTab()==="builder"?62:-1),i(),b(o.apiTab()==="filtering"?63:-1),i(),b(o.apiTab()==="types"?64:-1))},dependencies:[q,$,z,B,L,H,K,j,O,V],encapsulation:2})};export{W as TableDemoComponent};
