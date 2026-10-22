import { EFFECTS } from '../../core/effects/registry';
import { useStore } from '../state/store';
import { EffectCard } from './EffectCard';

export function EffectChain() {
  const { chain, addEffect } = useStore();
  return (
    <aside className="panel chain">
      <h3>Effects</h3>
      <select value="" onChange={(e) => e.target.value && addEffect(e.target.value)}>
        <option value="">+ Add effect</option>
        {EFFECTS.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
      </select>
      {chain.length === 0 && <p className="muted small">Effects run top to bottom on the selected pixels.</p>}
      {chain.map((inst, i) => <EffectCard key={inst.uid} instance={inst} index={i} last={i === chain.length - 1} />)}
    </aside>
  );
}
