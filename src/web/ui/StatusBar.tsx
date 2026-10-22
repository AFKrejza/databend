import { useStore } from '../state/store';

export function StatusBar() {
  const { image, render, view, setView } = useStore();
  // TODO: cursor readout (sample · px · channel · byte before→after · value before→after)
  return (
    <div className="status">
      <span>{image ? `${image.base.width}×${image.base.height}` : 'No image'}</span>
      {image?.proxy && <span>proxy {image.proxy.width}×{image.proxy.height}</span>}
      {render.before && <span>{render.before.length.toLocaleString()} samples</span>}
      <span>{render.status === 'rendering' ? 'rendering…' : `${render.ms.toFixed(0)} ms`}</span>
      <label>
        <input
          type="checkbox" checked={view.fullResPreview}
          onChange={(e) => setView({ fullResPreview: e.target.checked })}
        />
        Full-res preview
      </label>
    </div>
  );
}
