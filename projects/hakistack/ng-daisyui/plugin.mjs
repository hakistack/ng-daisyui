/**
 * @hakistack/ng-daisyui - Tailwind CSS v4 Plugin
 *
 * NOTE: This plugin is kept for backward compatibility.
 * The recommended approach is: @import "@hakistack/ng-daisyui";
 * which loads styles.css (safelists + component CSS) directly.
 */

export default function () {
  return {
    name: '@hakistack/ng-daisyui',
    styles: `
/* =====================================================
   SAFELISTS - DaisyUI v5 component classes
   (necessary because Tailwind can't scan node_modules)
   ===================================================== */

/* Alert */
@source inline("alert alert-primary alert-secondary alert-accent alert-neutral alert-info alert-success alert-warning alert-error alert-outline alert-soft alert-dash alert-vertical alert-horizontal");

/* Avatar */
@source inline("avatar avatar-group avatar-online avatar-offline placeholder");

/* Badge */
@source inline("badge badge-primary badge-secondary badge-accent badge-neutral badge-info badge-success badge-warning badge-error badge-outline badge-soft badge-dash badge-ghost badge-xs badge-sm badge-md badge-lg badge-xl");

/* Breadcrumbs */
@source inline("breadcrumbs");

/* Button */
@source inline("btn btn-primary btn-secondary btn-accent btn-neutral btn-info btn-success btn-warning btn-error btn-ghost btn-link btn-outline btn-soft btn-dash btn-active btn-disabled btn-xs btn-sm btn-md btn-lg btn-xl btn-block btn-wide btn-circle btn-square");

/* Calendar */
@source inline("calendar");

/* Card */
@source inline("card card-body card-title card-actions card-border card-dash card-bordered card-compact card-normal card-side image-full card-xs card-sm card-md card-lg card-xl");

/* Carousel */
@source inline("carousel carousel-item carousel-start carousel-center carousel-end carousel-vertical carousel-horizontal");

/* Chat */
@source inline("chat chat-bubble chat-start chat-end chat-image chat-header chat-footer chat-bubble-primary chat-bubble-secondary chat-bubble-accent chat-bubble-neutral chat-bubble-info chat-bubble-success chat-bubble-warning chat-bubble-error");

/* Checkbox */
@source inline("checkbox checkbox-primary checkbox-secondary checkbox-accent checkbox-neutral checkbox-info checkbox-success checkbox-warning checkbox-error checkbox-xs checkbox-sm checkbox-md checkbox-lg checkbox-xl");

/* Collapse */
@source inline("collapse collapse-title collapse-content collapse-arrow collapse-plus collapse-open collapse-close");

/* Countdown */
@source inline("countdown");

/* Diff */
@source inline("diff diff-item-1 diff-item-2 diff-resizer");

/* Divider */
@source inline("divider divider-horizontal divider-vertical divider-neutral divider-primary divider-secondary divider-accent divider-info divider-success divider-warning divider-error divider-start divider-end");

/* Dock */
@source inline("dock dock-label dock-active dock-xs dock-sm dock-md dock-lg dock-xl");

/* Drawer */
@source inline("drawer drawer-toggle drawer-content drawer-side drawer-overlay drawer-open drawer-end");

/* Dropdown */
@source inline("dropdown dropdown-content dropdown-end dropdown-top dropdown-bottom dropdown-left dropdown-right dropdown-hover dropdown-open");

/* Fab */
@source inline("fab fab-close fab-main-action fab-flower");

/* Fieldset */
@source inline("fieldset fieldset-legend");

/* File Input */
@source inline("file-input file-input-bordered file-input-ghost file-input-primary file-input-secondary file-input-accent file-input-neutral file-input-info file-input-success file-input-warning file-input-error file-input-xs file-input-sm file-input-md file-input-lg file-input-xl");

/* Filter */
@source inline("filter filter-reset");

/* Footer */
@source inline("footer footer-title footer-center footer-horizontal footer-vertical");

/* Form Control (v4 compat) */
@source inline("form-control label label-text label-text-alt");

/* Floating Label */
@source inline("floating-label");

/* Hero */
@source inline("hero hero-content hero-overlay");

/* Indicator */
@source inline("indicator indicator-item indicator-start indicator-center indicator-end indicator-top indicator-middle indicator-bottom");

/* Input */
@source inline("input input-bordered input-ghost input-primary input-secondary input-accent input-neutral input-info input-success input-warning input-error input-xs input-sm input-md input-lg input-xl");

/* Join */
@source inline("join join-item join-vertical join-horizontal");

/* Kbd */
@source inline("kbd kbd-xs kbd-sm kbd-md kbd-lg");

/* Link */
@source inline("link link-hover link-primary link-secondary link-accent link-neutral link-info link-success link-warning link-error");

/* List */
@source inline("list list-row list-col-wrap list-col-grow");

/* Loading */
@source inline("loading loading-spinner loading-dots loading-ring loading-ball loading-bars loading-infinity loading-xs loading-sm loading-md loading-lg");

/* Mask */
@source inline("mask mask-squircle mask-heart mask-hexagon mask-hexagon-2 mask-decagon mask-pentagon mask-diamond mask-square mask-circle mask-parallelogram mask-parallelogram-2 mask-parallelogram-3 mask-parallelogram-4 mask-star mask-star-2 mask-triangle mask-triangle-2 mask-triangle-3 mask-triangle-4 mask-half-1 mask-half-2");

/* Menu */
@source inline("menu menu-title menu-item menu-horizontal menu-vertical menu-compact menu-xs menu-sm menu-md menu-lg menu-active menu-disabled");

/* Modal */
@source inline("modal modal-box modal-action modal-backdrop modal-toggle modal-open modal-close modal-top modal-bottom modal-middle modal-start modal-end");

/* Navbar */
@source inline("navbar navbar-start navbar-center navbar-end");

/* Pagination */
@source inline("pagination");

/* Progress */
@source inline("progress progress-primary progress-secondary progress-accent progress-neutral progress-info progress-success progress-warning progress-error");

/* Radial Progress */
@source inline("radial-progress");

/* Radio */
@source inline("radio radio-primary radio-secondary radio-accent radio-neutral radio-info radio-success radio-warning radio-error radio-xs radio-sm radio-md radio-lg radio-xl");

/* Range */
@source inline("range range-primary range-secondary range-accent range-neutral range-info range-success range-warning range-error range-xs range-sm range-md range-lg range-xl");

/* Rating */
@source inline("rating rating-half rating-hidden rating-xs rating-sm rating-md rating-lg rating-xl");

/* Select */
@source inline("select select-bordered select-ghost select-primary select-secondary select-accent select-neutral select-info select-success select-warning select-error select-xs select-sm select-md select-lg select-xl");

/* Skeleton */
@source inline("skeleton skeleton-text");

/* Stack */
@source inline("stack stack-top stack-bottom stack-start stack-end");

/* Stat */
@source inline("stats stat stat-title stat-value stat-desc stat-figure stat-actions stats-vertical stats-horizontal");

/* Status */
@source inline("status status-primary status-secondary status-accent status-neutral status-info status-success status-warning status-error status-xs status-sm status-md status-lg status-xl");

/* Steps */
@source inline("steps step step-primary step-secondary step-accent step-neutral step-info step-success step-warning step-error step-icon steps-vertical steps-horizontal");

/* Swap */
@source inline("swap swap-on swap-off swap-active swap-rotate swap-flip swap-indeterminate");

/* Table */
@source inline("table table-zebra table-pin-rows table-pin-cols table-xs table-sm table-md table-lg table-xl");

/* Tabs */
@source inline("tabs tab tabs-box tabs-border tabs-lift tabs-bordered tabs-boxed tabs-lifted tabs-vertical tabs-top tabs-bottom tab-active tab-disabled tab-bordered tab-lifted tab-content tab-border-none");

/* Textarea */
@source inline("textarea textarea-bordered textarea-ghost textarea-primary textarea-secondary textarea-accent textarea-neutral textarea-info textarea-success textarea-warning textarea-error textarea-xs textarea-sm textarea-md textarea-lg textarea-xl");

/* Theme Controller */
@source inline("theme-controller");

/* Timeline */
@source inline("timeline timeline-start timeline-middle timeline-end timeline-box timeline-snap-icon timeline-compact timeline-vertical timeline-horizontal");

/* Toast */
@source inline("toast toast-start toast-center toast-end toast-top toast-middle toast-bottom");

/* Toggle */
@source inline("toggle toggle-primary toggle-secondary toggle-accent toggle-neutral toggle-info toggle-success toggle-warning toggle-error toggle-xs toggle-sm toggle-md toggle-lg toggle-xl");

/* Tooltip */
@source inline("tooltip tooltip-open tooltip-top tooltip-bottom tooltip-left tooltip-right tooltip-primary tooltip-secondary tooltip-accent tooltip-neutral tooltip-info tooltip-success tooltip-warning tooltip-error");

/* Validator */
@source inline("validator validator-hint");

/* Layout */
@source inline("flex flex-1 flex-col flex-wrap flex-none flex-shrink-0 shrink-0 grow");
@source inline("gap-0.5 gap-1 gap-2 gap-3 gap-4 gap-6 gap-x-4 gap-y-2");
@source inline("grid grid-cols-1 grid-cols-2 grid-cols-3 grid-cols-4 grid-cols-7");
@source inline("items-center items-start");
@source inline("justify-start justify-center justify-between justify-end");
@source inline("self-center");

/* Spacing */
@source inline("p-0 p-1 p-2 p-3 p-4");
@source inline("px-1 px-2 px-3 px-4");
@source inline("py-1 py-1.5 py-2 py-3");
@source inline("pl-10 pr-3 pr-10 pr-20");
@source inline("m-0 mt-0 mt-1 mt-2 mt-4 mt-6 mb-1 mb-2 mb-3 mb-4 mb-6 mb-8 ml-1 ml-2 mr-1 mr-1.5");
@source inline("mx-auto my-0 pb-2 pt-2 pt-3 pt-6");
@source inline("-mx-1 -my-2");
@source inline("space-x-1 space-x-2 space-y-1 space-y-2 space-y-4 space-y-6");

/* Sizing */
@source inline("w-3 w-4 w-5 w-8 w-16 w-full w-auto w-72 w-1/4 w-1/3 w-1/6 w-2/5");
@source inline("h-3 h-4 h-5 h-6 h-8 h-10 h-12 h-14 h-[1em]");
@source inline("min-w-16");
@source inline("max-h-48 max-h-64");

/* Colors */
@source inline("bg-base-100 bg-base-200 bg-base-200/30 bg-base-200/50 bg-base-200/70 bg-info/10 bg-info/20 bg-primary bg-primary/10 bg-secondary bg-accent/20 bg-success/10 bg-warning/10 bg-error/10 bg-yellow-200");
@source inline("border-base-100 border-base-200 border-base-300 border-base-content/5 border-base-content/10");
@source inline("text-base-content text-base-content/50 text-base-content/60 text-base-content/70 text-base-content/80 text-error text-primary-content text-white text-xs text-sm text-lg text-2xl");
@source inline("hover:bg-base-50 hover:bg-base-200 hover:bg-base-300 hover:bg-error/50 hover:border-primary hover:shadow-md hover:text-base-content hover:text-error hover:text-primary-content/70 hover:btn-primary hover:scale-105");

/* Typography */
@source inline("font-medium font-semibold font-bold");
@source inline("text-center text-left text-right");
@source inline("truncate whitespace-nowrap");

/* Borders/Rounded */
@source inline("border border-t border-t-0 border-b");
@source inline("rounded rounded-lg rounded-box rounded-b-box rounded-2xl rounded-full");

/* Effects/Positioning */
@source inline("shadow shadow-lg shadow-xl");
@source inline("opacity-30 opacity-40 opacity-50 opacity-60 opacity-70");
@source inline("z-10 z-20 z-50");
@source inline("absolute relative inset-y-0 right-0 left-0 bottom-full");
@source inline("overflow-auto overflow-hidden overflow-x-auto overflow-y-auto");

/* Transitions */
@source inline("transition-all transition-colors transition-transform duration-200 ease-out");

/* Interactive */
@source inline("cursor-pointer cursor-default cursor-not-allowed select-none hidden invisible rotate-180 sr-only");

/* Responsive - sm breakpoint */
@source inline("sm:flex-row sm:items-center sm:justify-between sm:justify-end");
@source inline("sm:col-span-1 sm:col-span-2 sm:col-span-3 sm:col-span-4 sm:col-span-5 sm:col-span-6 sm:col-span-7 sm:col-span-8 sm:col-span-9 sm:col-span-10 sm:col-span-11 sm:col-span-12");

/* Responsive - md breakpoint */
@source inline("md:grid-cols-2 md:grid-cols-3 md:w-[calc(50%-0.75rem)] md:w-[calc(33.333%-0.75rem)] md:w-[calc(25%-0.75rem)] md:w-[calc(66.666%-0.75rem)] md:w-[calc(75%-0.75rem)]");
@source inline("md:col-span-1 md:col-span-2 md:col-span-3 md:col-span-4 md:col-span-5 md:col-span-6 md:col-span-7 md:col-span-8 md:col-span-9 md:col-span-10 md:col-span-11 md:col-span-12");
@source inline("md:gap-2");

/* Responsive - lg breakpoint */
@source inline("lg:grid-cols-3 lg:grid-cols-4");
@source inline("lg:col-span-1 lg:col-span-2 lg:col-span-3 lg:col-span-4 lg:col-span-5 lg:col-span-6 lg:col-span-7 lg:col-span-8 lg:col-span-9 lg:col-span-10 lg:col-span-11 lg:col-span-12");

/* Responsive - xl breakpoint */
@source inline("xl:grid-cols-4 xl:grid-cols-5 xl:grid-cols-6 xl:grid-cols-8 xl:grid-cols-9 xl:grid-cols-10 xl:grid-cols-11");
@source inline("xl:col-span-1 xl:col-span-2 xl:col-span-3 xl:col-span-4 xl:col-span-5 xl:col-span-6 xl:col-span-7 xl:col-span-8 xl:col-span-9 xl:col-span-10 xl:col-span-11 xl:col-span-12");

/* Responsive - 2xl breakpoint */
@source inline("2xl:grid-cols-7 2xl:grid-cols-12");
@source inline("2xl:col-span-1 2xl:col-span-2 2xl:col-span-3 2xl:col-span-4 2xl:col-span-5 2xl:col-span-6 2xl:col-span-7 2xl:col-span-8 2xl:col-span-9 2xl:col-span-10 2xl:col-span-11 2xl:col-span-12");

/* Responsive - max breakpoints */
@source inline("max-sm:hidden");

/* Col-span utilities */
@source inline("col-span-1 col-span-2 col-span-3 col-span-4 col-span-5 col-span-6 col-span-7 col-span-8 col-span-9 col-span-10 col-span-11 col-span-12 col-span-full");

/* Focus/Active states */
@source inline("focus:outline-none focus:scale-105 active:scale-95");
`,
  };
}
