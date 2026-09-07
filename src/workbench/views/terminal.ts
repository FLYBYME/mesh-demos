import {
    command,
    each,
    element,
    text,
    type Json,
    type Node,
    type ViewContext,
} from '@flybyme/mesh-web';
import type { WorkbenchApi, WorkbenchInternal } from '../contract.js';

export function renderTerminalView(vx: ViewContext<Record<string, Json>, WorkbenchApi, WorkbenchInternal>): Node {
    const app = vx.internal;
    const sessionParam = typeof vx.params['session'] === 'string' ? vx.params['session'] : 'build';

    return element('Stack', {
        props: {
            class: 'workbench-pane workbench-terminal-pane',
            gap: 6,
            style: {
                padding: '10px',
                height: '100%',
                'box-sizing': 'border-box',
                display: 'flex',
                'flex-direction': 'column',
                'background-color': '#0d1117',
                color: '#c9d1d9',
                'font-family': 'ui-monospace, SFMono-Regular, Consolas, monospace',
                'font-size': '12px',
            },
        },
        children: [
            element('Row', {
                props: {
                    class: 'terminal-header-row',
                    style: {
                        display: 'flex',
                        'justify-content': 'space-between',
                        'align-items': 'center',
                        'padding-bottom': '6px',
                        'border-bottom': '1px solid #30363d',
                    },
                },
                children: [
                    element('Row', {
                        props: { style: { display: 'flex', gap: '8px', 'align-items': 'center' } },
                        children: [
                            element('Heading', {
                                props: {
                                    class: 'terminal-heading',
                                    style: { margin: '0', 'font-size': '13px', color: '#58a6ff' },
                                },
                                children: [text(() => `Terminal [${sessionParam}]`)],
                            }),
                            element('Badge', {
                                props: {
                                    class: 'badge terminal-status-badge',
                                    style: {
                                        'background-color': '#238636',
                                        color: '#ffffff',
                                        padding: '1px 6px',
                                        'border-radius': '10px',
                                        'font-size': '10px',
                                    },
                                },
                                children: [
                                    text(() => {
                                        const s = app.terminals().find((t) => t.session === sessionParam);
                                        return s?.status ?? 'idle';
                                    }),
                                ],
                            }),
                        ],
                    }),
                    element('Row', {
                        props: { style: { display: 'flex', gap: '4px' } },
                        children: [
                            element('Button', {
                                props: {
                                    class: 'btn-run-build',
                                    style: {
                                        padding: '2px 6px',
                                        'font-size': '11px',
                                        'border-radius': '3px',
                                        border: '1px solid #30363d',
                                        background: '#21262d',
                                        color: '#c9d1d9',
                                        cursor: 'pointer',
                                    },
                                },
                                intents: { activate: { action: command('workbench.runTerminalCmd', sessionParam, 'build') } },
                                children: [text('build')],
                            }),
                            element('Button', {
                                props: {
                                    class: 'btn-run-test',
                                    style: {
                                        padding: '2px 6px',
                                        'font-size': '11px',
                                        'border-radius': '3px',
                                        border: '1px solid #30363d',
                                        background: '#21262d',
                                        color: '#c9d1d9',
                                        cursor: 'pointer',
                                    },
                                },
                                intents: { activate: { action: command('workbench.runTerminalCmd', sessionParam, 'test') } },
                                children: [text('test')],
                            }),
                            element('Button', {
                                props: {
                                    class: 'btn-run-status',
                                    style: {
                                        padding: '2px 6px',
                                        'font-size': '11px',
                                        'border-radius': '3px',
                                        border: '1px solid #30363d',
                                        background: '#21262d',
                                        color: '#c9d1d9',
                                        cursor: 'pointer',
                                    },
                                },
                                intents: { activate: { action: command('workbench.runTerminalCmd', sessionParam, 'status') } },
                                children: [text('status')],
                            }),
                            element('Button', {
                                props: {
                                    class: 'btn-clear-terminal',
                                    style: {
                                        padding: '2px 6px',
                                        'font-size': '11px',
                                        'border-radius': '3px',
                                        border: '1px solid #30363d',
                                        background: '#21262d',
                                        color: '#f85149',
                                        cursor: 'pointer',
                                    },
                                },
                                intents: { activate: { action: command('workbench.clearTerminal', sessionParam) } },
                                children: [text('clear')],
                            }),
                        ],
                    }),
                ],
            }),
            element('Stack', {
                props: {
                    class: 'terminal-output-scroll',
                    gap: 2,
                    style: {
                        flex: '1',
                        overflow: 'auto',
                        padding: '4px',
                        background: '#010409',
                        'border-radius': '4px',
                        border: '1px solid #30363d',
                    },
                },
                children: [
                    each(
                        () => {
                            const s = app.terminals().find((t) => t.session === sessionParam);
                            return s ? s.lines : [];
                        },
                        (_line, index) => index,
                        (line) => element('Text', {
                            props: {
                                class: 'terminal-line',
                                style: () => {
                                    const l = line();
                                    return {
                                        display: 'block',
                                        'word-break': 'break-all',
                                        color: l.startsWith('$') ? '#58a6ff' : (l.includes('error') ? '#f85149' : (l.includes('passed') || l.includes('ready') ? '#3fb950' : '#8b949e')),
                                    };
                                },
                            },
                            children: [text(line)],
                        }),
                    ),
                ],
            }),
            element('Row', {
                props: {
                    class: 'terminal-input-row',
                    style: { display: 'flex', gap: '4px', 'align-items': 'center' },
                },
                children: [
                    element('Text', {
                        props: { style: { color: '#58a6ff', 'font-weight': 'bold' } },
                        children: [text('$')],
                    }),
                    element('Input', {
                        props: {
                            class: 'terminal-command-input',
                            placeholder: 'Type command and hit commit/enter...',
                            style: {
                                flex: '1',
                                background: '#161b22',
                                color: '#c9d1d9',
                                border: '1px solid #30363d',
                                'border-radius': '3px',
                                padding: '3px 6px',
                                'font-family': 'ui-monospace, SFMono-Regular, Consolas, monospace',
                                'font-size': '12px',
                            },
                        },
                        intents: {
                            commit: { action: command('workbench.submitTerminalInput', sessionParam) },
                        },
                    }),
                ],
            }),
            element('Row', {
                props: {
                    class: 'terminal-footer-row',
                    style: {
                        display: 'flex',
                        'justify-content': 'space-between',
                        'font-size': '10px',
                        color: '#8b949e',
                    },
                },
                children: [
                    element('Text', { children: [text(`Session: ${sessionParam}`)] }),
                    element('Text', { children: [text('tile: terminal')] }),
                ],
            }),
        ],
    });
}
