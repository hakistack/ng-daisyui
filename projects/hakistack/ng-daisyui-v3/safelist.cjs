/**
 * @hakistack/ng-daisyui-v3 - Tailwind CSS Safelist (CommonJS)
 *
 * Usage in tailwind.config.js:
 *   const { safelist } = require('@hakistack/ng-daisyui-v3/safelist');
 *
 *   module.exports = {
 *     safelist: safelist,
 *   }
 */

const safelist = [
  // DaisyUI Components - Alert
  'alert', 'alert-success', 'alert-info', 'alert-warning', 'alert-error', 'alert-soft',

  // DaisyUI Components - Badge
  'badge', 'badge-primary', 'badge-secondary', 'badge-neutral', 'badge-sm', 'badge-xs',

  // DaisyUI Components - Button
  'btn', 'btn-sm', 'btn-xs', 'btn-ghost', 'btn-primary', 'btn-secondary', 'btn-accent',
  'btn-error', 'btn-info', 'btn-success', 'btn-outline', 'btn-circle', 'btn-square',
  'btn-active', 'btn-disabled',

  // DaisyUI Components - Card
  'card', 'card-body', 'card-title', 'card-compact', 'card-border',

  // DaisyUI Components - Checkbox
  'checkbox', 'checkbox-sm',

  // DaisyUI Components - Divider
  'divider', 'divider-horizontal',

  // DaisyUI Components - Dropdown
  'dropdown', 'dropdown-content', 'dropdown-end', 'dropdown-right',

  // DaisyUI Components - Input
  'input', 'input-bordered', 'input-sm', 'input-xs', 'input-md', 'input-lg', 'input-xl',
  'input-error', 'input-disabled', 'input-neutral', 'input-primary', 'input-secondary',
  'input-accent', 'input-info', 'input-success', 'input-warning',

  // DaisyUI Components - Join
  'join', 'join-item',

  // DaisyUI Components - Label
  'label', 'label-text', 'label-text-alt',

  // DaisyUI Components - Menu
  'menu', 'menu-active',

  // DaisyUI Components - Radio
  'radio',

  // DaisyUI Components - Range
  'range', 'range-primary',

  // DaisyUI Components - Select
  'select', 'select-bordered', 'select-sm',

  // DaisyUI Components - Steps
  'steps', 'step', 'step-primary', 'step-error',

  // DaisyUI Components - Tab
  'tab', 'tabs', 'tabs-lift', 'tab-active', 'tab-disabled', 'tab-border-none',

  // DaisyUI Components - Table
  'table',

  // DaisyUI Components - Textarea
  'textarea', 'textarea-bordered',

  // DaisyUI Components - Toggle
  'toggle',

  // DaisyUI Components - Tooltip
  'tooltip',

  // DaisyUI Components - File Input
  'file-input', 'file-input-bordered', 'file-input-primary',

  // DaisyUI Components - Form Control
  'form-control',

  // Layout - Flexbox
  'flex', 'flex-1', 'flex-col', 'flex-wrap', 'flex-none', 'flex-shrink-0', 'shrink-0', 'grow',

  // Layout - Gap
  'gap-0.5', 'gap-1', 'gap-2', 'gap-3', 'gap-4', 'gap-6', 'gap-x-4', 'gap-y-2',

  // Layout - Grid
  'grid', 'grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4', 'grid-cols-7',

  // Layout - Alignment
  'items-center', 'items-start',
  'justify-start', 'justify-center', 'justify-between', 'justify-end',
  'self-center',

  // Spacing - Padding
  'p-0', 'p-1', 'p-2', 'p-3', 'p-4',
  'px-1', 'px-2', 'px-3', 'px-4',
  'py-1', 'py-1.5', 'py-2', 'py-3',
  'pl-10', 'pr-3', 'pr-10', 'pr-20',
  'pb-2', 'pt-2', 'pt-3', 'pt-6',

  // Spacing - Margin
  'm-0', 'mt-0', 'mt-1', 'mt-2', 'mt-4', 'mt-6',
  'mb-1', 'mb-2', 'mb-3', 'mb-4', 'mb-6', 'mb-8',
  'ml-1', 'ml-2', 'mr-1', 'mr-1.5',
  'mx-auto', 'my-0',
  '-mx-1', '-my-2',

  // Spacing - Space
  'space-x-1', 'space-x-2', 'space-y-1', 'space-y-2', 'space-y-4', 'space-y-6',

  // Sizing - Width
  'w-3', 'w-4', 'w-5', 'w-8', 'w-16', 'w-full', 'w-auto', 'w-72',
  'w-1/4', 'w-1/3', 'w-1/6', 'w-2/5',
  'min-w-16',

  // Sizing - Height
  'h-3', 'h-4', 'h-5', 'h-6', 'h-8', 'h-10', 'h-12', 'h-14', 'h-[1em]',
  'max-h-48', 'max-h-64',

  // Colors - Background
  'bg-base-100', 'bg-base-200', 'bg-base-200/50', 'bg-info/10', 'bg-info/20',
  'bg-primary', 'bg-secondary', 'bg-yellow-200',

  // Colors - Border
  'border-base-100', 'border-base-200', 'border-base-300',
  'border-base-content/5', 'border-base-content/10',

  // Colors - Text
  'text-base-content', 'text-base-content/50', 'text-base-content/60',
  'text-base-content/70', 'text-base-content/80',
  'text-error', 'text-primary-content', 'text-white',
  'text-xs', 'text-sm', 'text-lg', 'text-2xl',

  // Colors - Hover
  'hover:bg-base-50', 'hover:bg-base-200', 'hover:bg-error/50',
  'hover:text-base-content', 'hover:text-error', 'hover:btn-primary', 'hover:scale-105',

  // Typography
  'font-medium', 'font-semibold', 'font-bold',
  'text-center', 'text-left', 'text-right',
  'truncate', 'whitespace-nowrap',

  // Borders/Rounded
  'border', 'border-t', 'border-t-0', 'border-b',
  'rounded', 'rounded-lg', 'rounded-box', 'rounded-b-box', 'rounded-2xl', 'rounded-full',

  // Effects
  'shadow', 'shadow-lg', 'shadow-xl',
  'opacity-30', 'opacity-50', 'opacity-60', 'opacity-70',

  // Positioning
  'z-10', 'z-20', 'z-50',
  'absolute', 'relative', 'inset-y-0', 'right-0', 'left-0', 'bottom-full',
  'overflow-auto', 'overflow-hidden', 'overflow-x-auto', 'overflow-y-auto',

  // Transitions
  'transition-all', 'transition-colors', 'transition-transform', 'duration-200', 'ease-out',

  // Interactive
  'cursor-pointer', 'cursor-default', 'cursor-not-allowed', 'select-none',
  'hidden', 'invisible', 'rotate-180', 'sr-only',

  // Col-span utilities
  'col-span-1', 'col-span-2', 'col-span-3', 'col-span-4', 'col-span-5', 'col-span-6',
  'col-span-7', 'col-span-8', 'col-span-9', 'col-span-10', 'col-span-11', 'col-span-12',
  'col-span-full',

  // Focus/Active states
  'focus:outline-none', 'focus:scale-105', 'active:scale-95',

  // Responsive - sm breakpoint
  'sm:flex-row', 'sm:items-center', 'sm:justify-between', 'sm:justify-end',
  'sm:col-span-1', 'sm:col-span-2', 'sm:col-span-3', 'sm:col-span-4', 'sm:col-span-5',
  'sm:col-span-6', 'sm:col-span-7', 'sm:col-span-8', 'sm:col-span-9', 'sm:col-span-10',
  'sm:col-span-11', 'sm:col-span-12',

  // Responsive - md breakpoint
  'md:grid-cols-2', 'md:grid-cols-3',
  'md:w-[calc(50%-0.75rem)]', 'md:w-[calc(33.333%-0.75rem)]',
  'md:w-[calc(25%-0.75rem)]', 'md:w-[calc(66.666%-0.75rem)]', 'md:w-[calc(75%-0.75rem)]',
  'md:col-span-1', 'md:col-span-2', 'md:col-span-3', 'md:col-span-4', 'md:col-span-5',
  'md:col-span-6', 'md:col-span-7', 'md:col-span-8', 'md:col-span-9', 'md:col-span-10',
  'md:col-span-11', 'md:col-span-12',
  'md:gap-2',

  // Responsive - lg breakpoint
  'lg:grid-cols-3', 'lg:grid-cols-4',
  'lg:col-span-1', 'lg:col-span-2', 'lg:col-span-3', 'lg:col-span-4', 'lg:col-span-5',
  'lg:col-span-6', 'lg:col-span-7', 'lg:col-span-8', 'lg:col-span-9', 'lg:col-span-10',
  'lg:col-span-11', 'lg:col-span-12',

  // Responsive - xl breakpoint
  'xl:grid-cols-4', 'xl:grid-cols-5', 'xl:grid-cols-6', 'xl:grid-cols-8',
  'xl:grid-cols-9', 'xl:grid-cols-10', 'xl:grid-cols-11',
  'xl:col-span-1', 'xl:col-span-2', 'xl:col-span-3', 'xl:col-span-4', 'xl:col-span-5',
  'xl:col-span-6', 'xl:col-span-7', 'xl:col-span-8', 'xl:col-span-9', 'xl:col-span-10',
  'xl:col-span-11', 'xl:col-span-12',

  // Responsive - 2xl breakpoint
  '2xl:grid-cols-7', '2xl:grid-cols-12',
  '2xl:col-span-1', '2xl:col-span-2', '2xl:col-span-3', '2xl:col-span-4', '2xl:col-span-5',
  '2xl:col-span-6', '2xl:col-span-7', '2xl:col-span-8', '2xl:col-span-9', '2xl:col-span-10',
  '2xl:col-span-11', '2xl:col-span-12',

  // Responsive - max breakpoints
  'max-sm:hidden',
];

module.exports = { safelist };
module.exports.default = safelist;
