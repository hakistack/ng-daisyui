import type { ECharts } from 'echarts/core';

/**
 * Phase 0 keyboard-nav spike — proves feasibility per charts.md §7.2.
 *
 * Makes the chart host focusable and maps arrow keys to ECharts `highlight` +
 * `showTip` actions so screen-reader and keyboard users can traverse data
 * points without a mouse.
 *
 * Controls:
 *   ArrowRight / ArrowLeft  — cycle data points within the active series
 *   ArrowUp   / ArrowDown   — cycle across series (multi-series charts)
 *   Home / End              — jump to first / last data point
 *   Escape                  — hide tooltip, release selection
 *
 * Returns a dispose function the caller MUST call on teardown.
 */
export function attachKeyboardNav(host: HTMLElement, chart: ECharts): () => void {
  host.tabIndex = 0;
  host.setAttribute('role', 'img');

  let seriesIndex = 0;
  let dataIndex = 0;
  let engaged = false;

  const dims = () => {
    const opt = chart.getOption() as { series?: Array<{ data?: readonly unknown[] }> };
    const series = opt.series ?? [];
    return {
      seriesCount: series.length,
      dataCount: series[seriesIndex]?.data?.length ?? 0,
    };
  };

  const highlight = () => {
    chart.dispatchAction({ type: 'highlight', seriesIndex, dataIndex });
    chart.dispatchAction({ type: 'showTip', seriesIndex, dataIndex });
  };

  const downplay = () => {
    chart.dispatchAction({ type: 'downplay', seriesIndex, dataIndex });
  };

  const release = () => {
    if (!engaged) return;
    downplay();
    chart.dispatchAction({ type: 'hideTip' });
    engaged = false;
  };

  const onKeydown = (e: KeyboardEvent) => {
    const { seriesCount, dataCount } = dims();
    if (seriesCount === 0 || dataCount === 0) return;

    if (e.key === 'Escape') {
      release();
      return;
    }

    const prev = { seriesIndex, dataIndex };
    const wasEngaged = engaged;
    let handled = true;

    switch (e.key) {
      case 'ArrowRight':
        dataIndex = wasEngaged ? Math.min(dataCount - 1, dataIndex + 1) : 0;
        break;
      case 'ArrowLeft':
        dataIndex = wasEngaged ? Math.max(0, dataIndex - 1) : 0;
        break;
      case 'ArrowUp':
        seriesIndex = wasEngaged ? Math.max(0, seriesIndex - 1) : 0;
        break;
      case 'ArrowDown':
        seriesIndex = wasEngaged ? Math.min(seriesCount - 1, seriesIndex + 1) : 0;
        break;
      case 'Home':
        dataIndex = 0;
        break;
      case 'End':
        dataIndex = dataCount - 1;
        break;
      default:
        handled = false;
    }

    if (!handled) return;
    e.preventDefault();

    if (wasEngaged) chart.dispatchAction({ type: 'downplay', ...prev });
    engaged = true;
    highlight();
  };

  // No focus listener — mouse-driven focus must not trigger the shim, else it
  // fights ECharts' native hover highlight and produces flashing.
  host.addEventListener('keydown', onKeydown);
  host.addEventListener('blur', release);

  return () => {
    host.removeEventListener('keydown', onKeydown);
    host.removeEventListener('blur', release);
    release();
  };
}
