import { Component, input } from '@angular/core';
import { ApiDocEntry } from './api-table.types';

@Component({
  selector: 'app-api-table',
  template: `
    <div class="card card-border bg-base-100">
      <div class="card-body gap-3">
        <h3 class="card-title text-lg">{{ title() }}</h3>
        <div class="overflow-x-auto">
          <table class="table table-sm table-zebra">
            <thead>
              <tr class="text-xs uppercase tracking-wider text-base-content/50">
                <th>Name</th>
                <th>Type</th>
                <th>Default</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              @for (entry of entries(); track entry.name) {
                <tr>
                  <td>
                    <code class="text-primary text-xs font-semibold">{{ entry.name }}</code>
                  </td>
                  <td>
                    <code class="badge badge-ghost badge-sm text-xs font-mono">{{ entry.type }}</code>
                  </td>
                  <td>
                    <code class="text-xs text-base-content/50">{{ entry.default ?? '-' }}</code>
                  </td>
                  <td class="text-sm text-base-content/70">{{ entry.description }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class ApiTableComponent {
  title = input.required<string>();
  entries = input.required<ApiDocEntry[]>();
}
