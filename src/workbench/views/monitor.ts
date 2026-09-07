import {
    command,
    each,
    element,
    text,
    type Json,
    type Node,
    type ViewContext,
} from '@flybyme/mesh-web';
import type { WorkbenchApi } from '../contract.js';

// ---------------------------------------------------------------------------- views

export function renderMonitorView(vx: ViewContext<Record<string, Json>, WorkbenchApi>): Node {
    const app = vx.app;

    return element('Stack', {
        props: {
            class: 'workbench-pane workbench-monitor-pane',
            gap: 10,
            style: {
                padding: '12px',
                height: '100%',
                'box-sizing': 'border-box',
                display: 'flex',
                'flex-direction': 'column',
                'background-color': '#161b22',
                color: '#e6edf3',
                'font-family': 'system-ui, -apple-system, sans-serif',
                'font-size': '12px',
            },
        },
        children: [
            element('Row', {
                props: {
                    class: 'monitor-header-row',
                    style: {
                        display: 'flex',
                        'justify-content': 'space-between',
                        'align-items': 'center',
                        'padding-bottom': '6px',
                        'border-bottom': '1px solid #30363d',
                    },
                },
                children: [
                    element('Heading', {
                        props: {
                            class: 'monitor-heading',
                            style: { margin: '0', 'font-size': '13px', color: '#58a6ff' },
                        },
                        children: [text('System Monitor (Untiled)')],
                    }),
                    element('Badge', {
                        props: {
                            class: 'badge monitor-untiled-badge',
                            style: {
                                'background-color': '#388bfd',
                                color: '#ffffff',
                                padding: '2px 6px',
                                'border-radius': '6px',
                                'font-size': '10px',
                            },
                        },
                        children: [text('tile: none')],
                    }),
                ],
            }),
            element('Text', {
                props: {
                    class: 'monitor-explainer',
                    style: { color: '#8b949e', 'font-size': '11px', 'line-height': '1.4' },
                },
                children: [
                    text(
                        'This view declared no tile. In windowed mode it floats; in tiled mode it is automatically hidden by the manager.',
                    ),
                ],
            }),
            element('Stack', {
                props: {
                    class: 'monitor-stats-grid',
                    gap: 6,
                    style: {
                        padding: '8px',
                        border: '1px solid #30363d',
                        'border-radius': '4px',
                        background: '#0d1117',
                    },
                },
                children: [
                    element('Row', {
                        props: { style: { display: 'flex', 'justify-content': 'space-between' } },
                        children: [
                            element('Text', { props: { style: { color: '#8b949e' } }, children: [text('Active Windows:')] }),
                            element('Text', {
                                props: { class: 'monitor-stat-windows' },
                                children: [text(() => String(app.windows().length))],
                            }),
                        ],
                    }),
                    element('Row', {
                        props: { style: { display: 'flex', 'justify-content': 'space-between' } },
                        children: [
                            element('Text', { props: { style: { color: '#8b949e' } }, children: [text('Current Mode:')] }),
                            element('Text', {
                                props: { class: 'monitor-stat-mode' },
                                children: [text(() => app.getMode())],
                            }),
                        ],
                    }),
                ],
            }),
            element('Heading', {
                props: {
                    style: { margin: '4px 0 0 0', 'font-size': '11px', color: '#8b949e', 'font-weight': '600' },
                },
                children: [text('Workbench Event Log:')],
            }),
            element('Stack', {
                props: {
                    class: 'monitor-log-stream',
                    gap: 2,
                    style: {
                        flex: '1',
                        overflow: 'auto',
                        padding: '6px',
                        background: '#010409',
                        border: '1px solid #30363d',
                        'border-radius': '4px',
                        'font-family': 'ui-monospace, SFMono-Regular, Consolas, monospace',
                        'font-size': '11px',
                    },
                },
                children: [
                    each(
                        () => app.eventLogs(),
                        (_log, idx) => idx,
                        (log) => element('Text', {
                            props: { style: { display: 'block', color: '#8b949e' } },
                            children: [text(log)],
                        }),
                    ),
                ],
            }),
            element('Button', {
                props: {
                    class: 'btn-close-monitor',
                    style: {
                        padding: '4px 8px',
                        border: '1px solid #30363d',
                        background: '#21262d',
                        color: '#c9d1d9',
                        'border-radius': '4px',
                        cursor: 'pointer',
                    },
                },
                intents: { activate: { action: command('workbench.closeFocused') } },
                children: [text('Close Monitor Window')],
            }),
        ],
    });
}
