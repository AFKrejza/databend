import { EFFECTS } from '../../core/effects/registry';
import { useStore } from '../state/store';
import { EffectCard } from './EffectCard';

export function EffectChain() {
  const { chain, addEffect } = useStore();
  return (
    <aside className="panel chain">
      <select value="" onChange={(e) => e.target.value && addEffect(e.target.value)}>
        <option value="">+ Add effect</option>
        {EFFECTS.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
      </select>
      {chain.map((inst, i) => <EffectCard key={inst.uid} instance={inst} index={i} />)}
    </aside>
  );
}
