// One control generated from a ParamSpec. See docs/ui.md#components.
import type { ParamSpec, ParamValue } from '../../core/effects/types';

interface Props {
  spec: ParamSpec;
  value: ParamValue | undefined;
  onChange(value: ParamValue): void;
  /** End of an edit (pointer-up, select change): one undo step. */
  onCommit(): void;
}

const LOG_STEPS = 1000;

/** Slider position (0..LOG_STEPS) ⇄ value on a log scale. */
function fromLog(pos: number, min: number, max: number): number {
  return min * Math.pow(max / min, pos / LOG_STEPS);
}
function toLog(value: number, min: number, max: number): number {
  return (LOG_STEPS * Math.log(value / min)) / Math.log(max / min);
}

function format(v: number): string {
  return Math.abs(v) >= 100 ? v.toFixed(0) : Number(v.toPrecision(3)).toString();
}

export function ParamControl({ spec, value, onChange, onCommit }: Props) {
  const v = value ?? spec.default;
  switch (spec.type) {
    case 'number': {
      const n = Number(v);
      const log = spec.curve === 'log' && spec.min > 0;
      const reset = () => { onChange(spec.default); onCommit(); };
      return (
        <label className="param">
          <span className="param-label">
            {spec.label}
            <span className="param-value">
              <input
                type="number" min={spec.min} max={spec.max} step={spec.step ?? 'any'} value={format(n)}
                onChange={(e) => {
                  const x = Number(e.target.value);
                  if (Number.isFinite(x)) onChange(Math.min(spec.max, Math.max(spec.min, x)));
                }}
                onBlur={onCommit}
              />
              {spec.unit && <span className="unit">{spec.unit}</span>}
            </span>
          </span>
          <input
            type="range"
            min={log ? 0 : spec.min}
            max={log ? LOG_STEPS : spec.max}
            step={log ? 1 : (spec.step ?? (spec.max - spec.min) / 1000)}
            value={log ? toLog(n, spec.min, spec.max) : n}
            onChange={(e) => {
              const x = Number(e.target.value);
              onChange(log ? Number(fromLog(x, spec.min, spec.max).toPrecision(4)) : x);
            }}
            onPointerUp={onCommit}
            onKeyUp={onCommit}
            onDoubleClick={reset}
            title="Double-click to reset"
          />
        </label>
      );
    }
    case 'select':
      return (
        <label className="param">
          <span className="param-label">{spec.label}</span>
          <select value={String(v)} onChange={(e) => { onChange(e.target.value); onCommit(); }}>
            {spec.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      );
    case 'bool':
      return (
        <label className="param param-bool">
          <input type="checkbox" checked={Boolean(v)} onChange={(e) => { onChange(e.target.checked); onCommit(); }} />
          {spec.label}
        </label>
      );
  }
}
