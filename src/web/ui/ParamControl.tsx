// One control generated from a ParamSpec. See docs/ui.md#components.
import type { ParamSpec, ParamValue } from '../../core/effects/types';

interface Props {
  spec: ParamSpec;
  value: ParamValue | undefined;
  onChange(value: ParamValue): void;
  /** Pointer-up: end of a drag, one undo step. */
  onCommit(): void;
}

export function ParamControl({ spec, value, onChange, onCommit }: Props) {
  const v = value ?? spec.default;
  switch (spec.type) {
    case 'number':
      // TODO: log curve mapping, number box, double-click to reset, unit label
      return (
        <label className="param">
          {spec.label}
          <input
            type="range" min={spec.min} max={spec.max} step={spec.step ?? 'any'} value={Number(v)}
            onChange={(e) => onChange(Number(e.target.value))} onPointerUp={onCommit}
          />
          <span>{String(v)}{spec.unit ? ` ${spec.unit}` : ''}</span>
        </label>
      );
    case 'select':
      return (
        <label className="param">
          {spec.label}
          <select value={String(v)} onChange={(e) => { onChange(e.target.value); onCommit(); }}>
            {spec.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      );
    case 'bool':
      return (
        <label className="param">
          <input type="checkbox" checked={Boolean(v)} onChange={(e) => { onChange(e.target.checked); onCommit(); }} />
          {spec.label}
        </label>
      );
  }
}
