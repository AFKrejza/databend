import { getEffect } from '../../core/effects/registry';
import type { EffectInstance } from '../../core/effects/types';
import { useStore } from '../state/store';
import { ParamControl } from './ParamControl';

export function EffectCard({ instance, index }: { instance: EffectInstance; index: number }) {
  const { updateParams, removeEffect, moveEffect, toggleBypass, commitHistory } = useStore();
  const error = useStore((s) => s.render.errors[instance.uid]);
  const effect = getEffect(instance.effectId);
  if (!effect) return null;
  return (
    <section className={`effect-card${instance.bypass ? ' bypassed' : ''}`}>
      <header>
        <span>{effect.name}</span>
        <button title="Move up" onClick={() => moveEffect(instance.uid, index - 1)}>▲</button>
        <button title="Move down" onClick={() => moveEffect(instance.uid, index + 1)}>▼</button>
        <button title="Bypass" aria-pressed={instance.bypass} onClick={() => toggleBypass(instance.uid)}>⏻</button>
        <button title="Remove" onClick={() => removeEffect(instance.uid)}>✕</button>
      </header>
      {effect.params.map((spec) => (
        <ParamControl
          key={spec.key}
          spec={spec}
          value={instance.params[spec.key]}
          onChange={(v) => updateParams(instance.uid, { [spec.key]: v })}
          onCommit={commitHistory}
        />
      ))}
      {error && <p className="error">{error}</p>}
    </section>
  );
}
