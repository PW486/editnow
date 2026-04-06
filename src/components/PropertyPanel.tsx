import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  Info,
} from 'lucide-react';
import type { ImageLayer, LayerItem, LineLayer, RectLayer, TextLayer } from '../types';

type ShapeStyleLayer = Pick<RectLayer, 'fill' | 'stroke' | 'strokeWidth'>;

interface PropertyPanelProps {
  selectedLayer: LayerItem | null;
  selectedCount: number;
  isNestedSelection?: boolean;
  canvasSize: { width: number; height: number };
  onChange: (updated: LayerItem) => void;
  onAlign: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  onBulkVisibility: (visible: boolean) => void;
  onBulkLock: (locked: boolean) => void;
  onDeleteSelected: () => void;
  onAlignSelection: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  onDistributeSelection: (axis: 'horizontal' | 'vertical') => void;
  onGroupSelection: () => void;
  onUngroupSelection: () => void;
}

const PropertyPanel: React.FC<PropertyPanelProps> = ({
  selectedLayer,
  selectedCount,
  isNestedSelection = false,
  canvasSize,
  onChange,
  onAlign,
  onBulkVisibility,
  onBulkLock,
  onDeleteSelected,
  onAlignSelection,
  onDistributeSelection,
  onGroupSelection,
  onUngroupSelection,
}) => {
  if (!selectedLayer && selectedCount === 0) {
    return <div className="p-5 text-gray-500 text-sm">No layer selected.</div>;
  }

  if (selectedCount > 1) {
    const alignButtons = [
      { key: 'left', label: 'Align left', icon: AlignHorizontalJustifyStart },
      { key: 'center', label: 'Align center', icon: AlignHorizontalJustifyCenter },
      { key: 'right', label: 'Align right', icon: AlignHorizontalJustifyEnd },
      { key: 'top', label: 'Align top', icon: AlignVerticalJustifyStart },
      { key: 'middle', label: 'Align middle', icon: AlignVerticalJustifyCenter },
      { key: 'bottom', label: 'Align bottom', icon: AlignVerticalJustifyEnd },
    ] as const;

    return (
      <div className="p-5 space-y-5">
        <div className="rounded border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs text-blue-100">
          {selectedCount} layers selected. Align actions will apply to all unlocked selected layers.
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onGroupSelection} className="col-span-2 rounded bg-blue-500/15 px-2 py-1.5 text-xs text-blue-100 border border-blue-500/30">Group Selected</button>
          <button onClick={() => onBulkVisibility(true)} className="rounded bg-gray-700 px-2 py-1.5 text-xs text-gray-200">Show All</button>
          <button onClick={() => onBulkVisibility(false)} className="rounded bg-gray-700 px-2 py-1.5 text-xs text-gray-200">Hide All</button>
          <button onClick={() => onBulkLock(false)} className="rounded bg-gray-700 px-2 py-1.5 text-xs text-gray-200">Unlock All</button>
          <button onClick={() => onBulkLock(true)} className="rounded bg-gray-700 px-2 py-1.5 text-xs text-gray-200">Lock All</button>
          <button onClick={onDeleteSelected} className="col-span-2 rounded bg-red-500/15 px-2 py-1.5 text-xs text-red-200 border border-red-500/30">Delete Selected</button>
        </div>
        <div className="space-y-2 pt-2 border-t border-gray-700">
          <h4 className="text-xs font-semibold text-gray-400">Align To Selection</h4>
          <div className="grid grid-cols-3 gap-2">
            {alignButtons.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => onAlignSelection(key)}
                title={label}
                className="flex items-center justify-center rounded bg-gray-700 px-2 py-2 text-gray-200 transition-colors hover:bg-gray-600"
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2 pt-2 border-t border-gray-700">
          <h4 className="text-xs font-semibold text-gray-400">Distribute</h4>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => onDistributeSelection('horizontal')} className="rounded bg-gray-700 px-2 py-1.5 text-xs text-gray-200">Horizontal</button>
            <button onClick={() => onDistributeSelection('vertical')} className="rounded bg-gray-700 px-2 py-1.5 text-xs text-gray-200">Vertical</button>
          </div>
        </div>
        <div className="space-y-2 pt-2 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-gray-400">Align To Canvas</h4>
            <span className="text-[10px] text-gray-500">
              {canvasSize.width} x {canvasSize.height}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {alignButtons.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => onAlign(key)}
                title={label}
                className="flex items-center justify-center rounded bg-gray-700 px-2 py-2 text-gray-200 transition-colors hover:bg-gray-600"
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!selectedLayer) {
    return <div className="p-5 text-gray-500 text-sm">No layer selected.</div>;
  }

  const isLocked = selectedLayer.locked;

  const handleChange = (patch: Partial<LayerItem>) => {
    if (isLocked) {
      return;
    }
    onChange({ ...selectedLayer, ...patch } as LayerItem);
  };

  const alignButtons = [
    { key: 'left', label: 'Align left', icon: AlignHorizontalJustifyStart },
    { key: 'center', label: 'Align center', icon: AlignHorizontalJustifyCenter },
    { key: 'right', label: 'Align right', icon: AlignHorizontalJustifyEnd },
    { key: 'top', label: 'Align top', icon: AlignVerticalJustifyStart },
    { key: 'middle', label: 'Align middle', icon: AlignVerticalJustifyCenter },
    { key: 'bottom', label: 'Align bottom', icon: AlignVerticalJustifyEnd },
  ] as const;

  return (
    <div className="p-5 space-y-5">
      {isLocked && (
        <div className="rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          This layer is locked. Unlock it from the Layers panel to edit properties.
        </div>
      )}
      {isNestedSelection && (
        <div className="rounded border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
          Editing a layer inside a group. Position values are relative to the parent group.
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <label className="text-xs text-gray-400 block mb-1">Layer Name</label>
          <input
            type="text"
            value={selectedLayer.name}
            onChange={(event) => handleChange({ name: event.target.value })}
            disabled={isLocked}
            className="w-full bg-gray-700 rounded px-2 py-1 text-sm text-white border border-gray-600 focus:border-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">X Position</label>
          <input
            type="number"
            value={Math.round(selectedLayer.x)}
            onChange={(event) => handleChange({ x: Number(event.target.value) })}
            disabled={isLocked}
            className="w-full bg-gray-700 rounded px-2 py-1 text-sm text-white border border-gray-600 focus:border-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Y Position</label>
          <input
            type="number"
            value={Math.round(selectedLayer.y)}
            onChange={(event) => handleChange({ y: Number(event.target.value) })}
            disabled={isLocked}
            className="w-full bg-gray-700 rounded px-2 py-1 text-sm text-white border border-gray-600 focus:border-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Rotation</label>
          <input
            type="number"
            value={Math.round(selectedLayer.rotation)}
            onChange={(event) => handleChange({ rotation: Number(event.target.value) })}
            disabled={isLocked}
            className="w-full bg-gray-700 rounded px-2 py-1 text-sm text-white border border-gray-600 focus:border-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Opacity</label>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(selectedLayer.opacity * 100)}
            onChange={(event) => handleChange({ opacity: Number(event.target.value) / 100 })}
            disabled={isLocked}
            className="w-full accent-blue-500"
          />
          <div className="text-right text-xs text-gray-400">{Math.round(selectedLayer.opacity * 100)}%</div>
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-gray-400">Align To Canvas</h4>
          <span className="text-[10px] text-gray-500">
            {canvasSize.width} x {canvasSize.height}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {alignButtons.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => onAlign(key)}
              disabled={isLocked || isNestedSelection}
              title={label}
              className="flex items-center justify-center rounded bg-gray-700 px-2 py-2 text-gray-200 transition-colors hover:bg-gray-600 disabled:opacity-40 disabled:hover:bg-gray-700"
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      {selectedLayer.type === 'image' && (
        <ImageFilterSection
          layer={selectedLayer}
          canvasSize={canvasSize}
          onChange={handleChange}
        />
      )}

      {selectedLayer.type === 'text' && (
        <TextSection
          layer={selectedLayer}
          onChange={handleChange}
        />
      )}

      {(selectedLayer.type === 'rect' || selectedLayer.type === 'circle') && (
        <ShapeSection
          layer={selectedLayer}
          onChange={handleChange}
        />
      )}

      {selectedLayer.type === 'line' && (
        <LineSection
          layer={selectedLayer}
          onChange={handleChange}
        />
      )}

      {selectedLayer.type === 'drawing' && (
        <DrawingSection strokeCount={selectedLayer.strokes.length} />
      )}

      {selectedLayer.type === 'group' && (
        <div className="space-y-3 pt-2 border-t border-gray-700">
          <h4 className="text-xs font-semibold text-gray-400">Group</h4>
          <div className="rounded border border-gray-700 bg-gray-800/60 px-3 py-2 text-xs text-gray-300">
            {selectedLayer.children.length} child layers inside this group.
          </div>
          <button onClick={onUngroupSelection} className="w-full rounded bg-blue-500/15 px-2 py-1.5 text-xs text-blue-100 border border-blue-500/30">
            Ungroup
          </button>
        </div>
      )}
    </div>
  );
};

const InfoTooltip = ({ content }: { content: string }) => {
  const [tooltip, setTooltip] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!tooltip) {
      return;
    }

    const handleWindowChange = () => {
      setTooltip(null);
    };

    window.addEventListener('scroll', handleWindowChange, true);
    window.addEventListener('resize', handleWindowChange);

    return () => {
      window.removeEventListener('scroll', handleWindowChange, true);
      window.removeEventListener('resize', handleWindowChange);
    };
  }, [tooltip]);

  const showTooltip = (event: React.MouseEvent<HTMLSpanElement> | React.FocusEvent<HTMLSpanElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltip({
      top: rect.bottom + 8,
      left: rect.left + rect.width / 2,
    });
  };

  const hideTooltip = () => {
    setTooltip(null);
  };

  return (
    <>
      <span
        tabIndex={0}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className="inline-flex text-gray-500 outline-none"
      >
        <Info className="h-3.5 w-3.5" />
      </span>
      {tooltip && createPortal(
        <div
          className="pointer-events-none fixed z-[100] w-52 -translate-x-1/2 rounded-md border border-gray-700 bg-gray-950/95 px-2.5 py-2 text-[11px] text-gray-200 shadow-lg"
          style={{
            top: tooltip.top,
            left: tooltip.left,
          }}
        >
          {content}
        </div>,
        document.body,
      )}
    </>
  );
};

const ImageFilterSection = ({
  layer,
  canvasSize,
  onChange,
}: {
  layer: ImageLayer;
  canvasSize: { width: number; height: number };
  onChange: (patch: Partial<LayerItem>) => void;
}) => {
  const sourceWidth = layer.image.naturalWidth || layer.image.width || layer.width;
  const sourceHeight = layer.image.naturalHeight || layer.image.height || layer.height;
  const [cropDraft, setCropDraft] = useState<CropPatch>({
    cropX: layer.cropX,
    cropY: layer.cropY,
    cropWidth: layer.cropWidth,
    cropHeight: layer.cropHeight,
  });

  React.useEffect(() => {
    setCropDraft({
      cropX: layer.cropX,
      cropY: layer.cropY,
      cropWidth: layer.cropWidth,
      cropHeight: layer.cropHeight,
    });
  }, [layer.cropX, layer.cropY, layer.cropWidth, layer.cropHeight, layer.id]);

  const centerImage = () => {
    onChange({
      x: canvasSize.width / 2 - layer.width / 2,
      y: canvasSize.height / 2 - layer.height / 2,
    });
  };

  const fitImage = (mode: 'contain' | 'cover') => {
    const widthRatio = canvasSize.width / sourceWidth;
    const heightRatio = canvasSize.height / sourceHeight;
    const ratio = mode === 'contain' ? Math.min(widthRatio, heightRatio) : Math.max(widthRatio, heightRatio);
    const nextWidth = sourceWidth * ratio;
    const nextHeight = sourceHeight * ratio;

    onChange({
      width: nextWidth,
      height: nextHeight,
      x: canvasSize.width / 2 - nextWidth / 2,
      y: canvasSize.height / 2 - nextHeight / 2,
    });
  };

  const resetAdjustments = () => {
    onChange({
      cropX: 0,
      cropY: 0,
      cropWidth: sourceWidth,
      cropHeight: sourceHeight,
      brightness: 0,
      contrast: 0,
      blur: 0,
      saturation: 0,
      flipX: false,
      flipY: false,
      rotation: 0,
      opacity: 1,
    });
    setCropDraft({
      cropX: 0,
      cropY: 0,
      cropWidth: sourceWidth,
      cropHeight: sourceHeight,
    });
  };

  const centerCropSquare = () => {
    const size = Math.min(sourceWidth, sourceHeight);
    setCropDraft({
      cropX: (sourceWidth - size) / 2,
      cropY: (sourceHeight - size) / 2,
      cropWidth: size,
      cropHeight: size,
    });
  };

  const clampCropPatch = (patch: Partial<ImageLayer>) => {
    const nextCropX = Math.max(0, Math.min(sourceWidth - 1, patch.cropX ?? cropDraft.cropX));
    const nextCropY = Math.max(0, Math.min(sourceHeight - 1, patch.cropY ?? cropDraft.cropY));
    const nextCropWidth = Math.max(1, Math.min(sourceWidth - nextCropX, patch.cropWidth ?? cropDraft.cropWidth));
    const nextCropHeight = Math.max(1, Math.min(sourceHeight - nextCropY, patch.cropHeight ?? cropDraft.cropHeight));

    setCropDraft({
      cropX: nextCropX,
      cropY: nextCropY,
      cropWidth: nextCropWidth,
      cropHeight: nextCropHeight,
    });
  };

  const applyCropDraft = () => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(cropDraft.cropWidth));
    canvas.height = Math.max(1, Math.round(cropDraft.cropHeight));
    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    context.drawImage(
      layer.image,
      cropDraft.cropX,
      cropDraft.cropY,
      cropDraft.cropWidth,
      cropDraft.cropHeight,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    const nextSrc = canvas.toDataURL('image/png');
    const nextImage = new window.Image();

    nextImage.onload = () => {
      onChange({
        image: nextImage,
        src: nextSrc,
        cropX: 0,
        cropY: 0,
        cropWidth: nextImage.width,
        cropHeight: nextImage.height,
      });

      setCropDraft({
        cropX: 0,
        cropY: 0,
        cropWidth: nextImage.width,
        cropHeight: nextImage.height,
      });
    };

    nextImage.src = nextSrc;
  };

  const resetCropDraft = () => {
    setCropDraft({
      cropX: 0,
      cropY: 0,
      cropWidth: sourceWidth,
      cropHeight: sourceHeight,
    });
  };

  return (
    <div className="space-y-3 pt-2 border-t border-gray-700">
      <h4 className="text-xs font-semibold text-gray-400">Image Actions</h4>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => fitImage('contain')} className="rounded bg-gray-700 px-2 py-1.5 text-xs text-gray-200">Fit Canvas</button>
        <button onClick={() => fitImage('cover')} className="rounded bg-gray-700 px-2 py-1.5 text-xs text-gray-200">Fill Canvas</button>
        <button onClick={centerImage} className="rounded bg-gray-700 px-2 py-1.5 text-xs text-gray-200">Center</button>
        <button onClick={resetAdjustments} className="rounded bg-gray-700 px-2 py-1.5 text-xs text-gray-200">Reset Image</button>
        <button onClick={() => onChange({ rotation: layer.rotation - 90 })} className="rounded bg-gray-700 px-2 py-1.5 text-xs text-gray-200">Rotate -90°</button>
        <button onClick={() => onChange({ rotation: layer.rotation + 90 })} className="rounded bg-gray-700 px-2 py-1.5 text-xs text-gray-200">Rotate +90°</button>
        <button onClick={() => onChange({ flipX: !layer.flipX })} className="rounded bg-gray-700 px-2 py-1.5 text-xs text-gray-200">
          {layer.flipX ? 'Unflip H' : 'Flip H'}
        </button>
        <button onClick={() => onChange({ flipY: !layer.flipY })} className="rounded bg-gray-700 px-2 py-1.5 text-xs text-gray-200">
          {layer.flipY ? 'Unflip V' : 'Flip V'}
        </button>
      </div>

      <div className="mt-2 space-y-2 pt-3 border-t border-gray-700">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-semibold text-gray-400">Crop</h4>
          <InfoTooltip content="Drag to move the crop box. Resize from the bottom-right handle." />
        </div>
        <ImageCropPreview
          layer={layer}
          sourceWidth={sourceWidth}
          sourceHeight={sourceHeight}
          crop={cropDraft}
          onChange={clampCropPatch}
        />
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={centerCropSquare}
            className="rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-gray-200"
          >
            Square Crop
          </button>
          <button
            onClick={resetCropDraft}
            className="rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-gray-200"
          >
            Reset Draft
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setCropDraft({ cropX: layer.cropX, cropY: layer.cropY, cropWidth: layer.cropWidth, cropHeight: layer.cropHeight })}
            className="rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-gray-200"
          >
            Cancel Draft
          </button>
          <button
            onClick={applyCropDraft}
            className="rounded bg-blue-600 px-2 py-1.5 text-xs font-medium text-white"
          >
            Apply Crop
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Crop X</label>
            <input
              type="number"
              min="0"
              max={Math.max(0, sourceWidth - 1)}
              value={Math.round(cropDraft.cropX)}
              onChange={(event) => clampCropPatch({ cropX: Number(event.target.value) })}
              className="w-full bg-gray-700 rounded px-2 py-1 text-sm text-white border border-gray-600 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Crop Y</label>
            <input
              type="number"
              min="0"
              max={Math.max(0, sourceHeight - 1)}
              value={Math.round(cropDraft.cropY)}
              onChange={(event) => clampCropPatch({ cropY: Number(event.target.value) })}
              className="w-full bg-gray-700 rounded px-2 py-1 text-sm text-white border border-gray-600 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Crop Width</label>
            <input
              type="number"
              min="1"
              max={Math.max(1, sourceWidth - cropDraft.cropX)}
              value={Math.round(cropDraft.cropWidth)}
              onChange={(event) => clampCropPatch({ cropWidth: Number(event.target.value) })}
              className="w-full bg-gray-700 rounded px-2 py-1 text-sm text-white border border-gray-600 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Crop Height</label>
            <input
              type="number"
              min="1"
              max={Math.max(1, sourceHeight - cropDraft.cropY)}
              value={Math.round(cropDraft.cropHeight)}
              onChange={(event) => clampCropPatch({ cropHeight: Number(event.target.value) })}
              className="w-full bg-gray-700 rounded px-2 py-1 text-sm text-white border border-gray-600 focus:border-blue-500 outline-none"
            />
          </div>
        </div>
      </div>

      <h4 className="text-xs font-semibold text-gray-400 pt-1">Filters</h4>

      <div>
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Brightness</span>
          <span>{Math.round((layer.brightness ?? 0) * 100)}%</span>
        </div>
        <input
          type="range"
          min="-1"
          max="1"
          step="0.05"
          value={layer.brightness ?? 0}
          onChange={(event) => onChange({ brightness: Number(event.target.value) })}
          className="w-full accent-blue-500"
        />
      </div>

      <div>
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Contrast</span>
          <span>{Math.round(layer.contrast ?? 0)}</span>
        </div>
        <input
          type="range"
          min="-100"
          max="100"
          step="1"
          value={layer.contrast ?? 0}
          onChange={(event) => onChange({ contrast: Number(event.target.value) })}
          className="w-full accent-blue-500"
        />
      </div>

      <div>
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Blur</span>
          <span>{layer.blur ?? 0}px</span>
        </div>
        <input
          type="range"
          min="0"
          max="40"
          step="1"
          value={layer.blur ?? 0}
          onChange={(event) => onChange({ blur: Number(event.target.value) })}
          className="w-full accent-blue-500"
        />
      </div>

      <div>
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Saturation</span>
          <span>{layer.saturation ?? 0}</span>
        </div>
        <input
          type="range"
          min="-2"
          max="10"
          step="0.1"
          value={layer.saturation ?? 0}
          onChange={(event) => onChange({ saturation: Number(event.target.value) })}
          className="w-full accent-blue-500"
        />
      </div>
    </div>
  );
};

type CropPatch = Pick<ImageLayer, 'cropX' | 'cropY' | 'cropWidth' | 'cropHeight'>;

const ImageCropPreview = ({
  layer,
  sourceWidth,
  sourceHeight,
  crop,
  onChange,
}: {
  layer: ImageLayer;
  sourceWidth: number;
  sourceHeight: number;
  crop: CropPatch;
  onChange: (patch: CropPatch) => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragMode, setDragMode] = useState<'move' | 'resize' | null>(null);
  const [previewSrc, setPreviewSrc] = useState('');
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    cropX: number;
    cropY: number;
    cropWidth: number;
    cropHeight: number;
  } | null>(null);

  const previewHeight = useMemo(() => {
    const aspectRatio = sourceHeight / sourceWidth;
    return Math.max(160, Math.min(220, 220 * aspectRatio));
  }, [sourceHeight, sourceWidth]);

  const cropStyle = {
    left: `${(crop.cropX / sourceWidth) * 100}%`,
    top: `${(crop.cropY / sourceHeight) * 100}%`,
    width: `${(crop.cropWidth / sourceWidth) * 100}%`,
    height: `${(crop.cropHeight / sourceHeight) * 100}%`,
  };

  React.useEffect(() => {
    if (!layer.image || !layer.image.complete || sourceWidth <= 0 || sourceHeight <= 0) {
      return;
    }

    const previewWidth = 480;
    const previewHeightPx = Math.max(1, Math.round(previewWidth * (sourceHeight / sourceWidth)));
    const canvas = document.createElement('canvas');
    canvas.width = previewWidth;
    canvas.height = previewHeightPx;
    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(layer.image, 0, 0, canvas.width, canvas.height);
    setPreviewSrc(canvas.toDataURL('image/png'));
  }, [layer.image, sourceHeight, sourceWidth]);

  const startDrag = (event: React.MouseEvent<HTMLDivElement>, mode: 'move' | 'resize') => {
    event.preventDefault();
    event.stopPropagation();
    dragStartRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      cropX: crop.cropX,
      cropY: crop.cropY,
      cropWidth: crop.cropWidth,
      cropHeight: crop.cropHeight,
    };
    setDragMode(mode);
  };

  React.useEffect(() => {
    if (!dragMode) {
      return;
    }

    const handlePointerMove = (event: MouseEvent) => {
      const container = containerRef.current;
      const dragStart = dragStartRef.current;
      if (!container || !dragStart) {
        return;
      }

      const bounds = container.getBoundingClientRect();
      const scaleX = sourceWidth / bounds.width;
      const scaleY = sourceHeight / bounds.height;
      const deltaX = (event.clientX - dragStart.clientX) * scaleX;
      const deltaY = (event.clientY - dragStart.clientY) * scaleY;

      if (dragMode === 'move') {
        const nextCropWidth = Math.max(1, Math.min(sourceWidth, dragStart.cropWidth));
        const nextCropHeight = Math.max(1, Math.min(sourceHeight, dragStart.cropHeight));
        const nextCropX = Math.max(0, Math.min(sourceWidth - nextCropWidth, dragStart.cropX + deltaX));
        const nextCropY = Math.max(0, Math.min(sourceHeight - nextCropHeight, dragStart.cropY + deltaY));

        onChange({
          cropX: nextCropX,
          cropY: nextCropY,
          cropWidth: nextCropWidth,
          cropHeight: nextCropHeight,
        });
        return;
      }

      const nextCropWidth = Math.max(1, Math.min(sourceWidth - dragStart.cropX, dragStart.cropWidth + deltaX));
      const nextCropHeight = Math.max(1, Math.min(sourceHeight - dragStart.cropY, dragStart.cropHeight + deltaY));
      onChange({
        cropX: dragStart.cropX,
        cropY: dragStart.cropY,
        cropWidth: nextCropWidth,
        cropHeight: nextCropHeight,
      });
    };

    const handlePointerUp = () => {
      setDragMode(null);
      dragStartRef.current = null;
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
    };
  }, [dragMode, onChange, sourceHeight, sourceWidth]);

  return (
    <div>
      <div
        ref={containerRef}
        className="relative overflow-visible"
        style={{ height: previewHeight }}
      >
        <div className="relative h-full overflow-hidden border border-gray-700 bg-gray-900">
          <img
            src={previewSrc || layer.image.currentSrc || layer.image.src || layer.src}
            alt={layer.name}
            draggable={false}
            className="h-full w-full select-none object-fill opacity-80"
          />
          <div className="absolute inset-0 bg-black/35" />
          <div
            className="absolute cursor-move border-2 border-blue-400 bg-blue-500/10 shadow-[0_0_0_9999px_rgba(3,7,18,0.45)]"
            style={cropStyle}
            onMouseDown={(event) => startDrag(event, 'move')}
          >
            <div className="absolute left-2 top-2 rounded-sm bg-blue-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
              Crop
            </div>
            <div
              className="absolute bottom-1 right-1 h-5 w-5 cursor-se-resize"
              onMouseDown={(event) => startDrag(event, 'resize')}
            >
              <div className="absolute bottom-0 right-0 h-4 w-4 rounded-br-sm border-b-[3px] border-r-[3px] border-white shadow-[1px_1px_0_rgba(15,23,42,0.9)]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const TextSection = ({
  layer,
  onChange,
}: {
  layer: TextLayer;
  onChange: (patch: Partial<LayerItem>) => void;
}) => {
  const [widthDraft, setWidthDraft] = useState(String(Math.round(layer.width ?? 220)));

  useEffect(() => {
    setWidthDraft(String(Math.round(layer.width ?? 220)));
  }, [layer.id, layer.width]);

  const commitWidthDraft = () => {
    const parsed = Number(widthDraft);
    if (!Number.isFinite(parsed)) {
      setWidthDraft(String(Math.round(layer.width ?? 220)));
      return;
    }

    const nextWidth = Math.max(80, parsed);
    setWidthDraft(String(Math.round(nextWidth)));
    if (nextWidth !== layer.width) {
      onChange({ width: nextWidth });
    }
  };

  return (
    <div className="space-y-3 pt-2 border-t border-gray-700">
      <div>
        <label className="text-xs text-gray-400 block mb-1">Content</label>
        <textarea
          value={layer.text}
          onChange={(event) => onChange({ text: event.target.value })}
          className="w-full bg-gray-700 rounded px-2 py-1 text-sm text-white border border-gray-600 focus:border-blue-500 outline-none min-h-[60px]"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Font Size</label>
          <input
            type="number"
            value={layer.fontSize}
            onChange={(event) => onChange({ fontSize: Number(event.target.value) })}
            className="w-full bg-gray-700 rounded px-2 py-1 text-sm text-white border border-gray-600 focus:border-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={layer.fill}
              onChange={(event) => onChange({ fill: event.target.value })}
              className="w-8 h-8 rounded cursor-pointer border-0 p-0 overflow-hidden bg-transparent"
            />
            <span className="text-xs text-gray-300">{layer.fill}</span>
          </div>
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-400 block mb-1">Font Family</label>
        <select
          value={layer.fontFamily}
          onChange={(event) => onChange({ fontFamily: event.target.value })}
          className="w-full bg-gray-700 rounded px-2 py-1 text-sm text-white border border-gray-600 focus:border-blue-500 outline-none"
        >
          <option value="Arial">Arial</option>
          <option value="Inter">Inter</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Courier New">Courier New</option>
          <option value="Georgia">Georgia</option>
          <option value="Verdana">Verdana</option>
        </select>
      </div>
      <div>
        <label className="text-xs text-gray-400 block mb-1">Alignment</label>
        <select
          value={layer.align}
          onChange={(event) => onChange({ align: event.target.value as TextLayer['align'] })}
          className="w-full bg-gray-700 rounded px-2 py-1 text-sm text-white border border-gray-600 focus:border-blue-500 outline-none"
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </div>
      <div>
        <label className="text-xs text-gray-400 block mb-1">Line Height</label>
        <input
          type="range"
          min="0.8"
          max="2.4"
          step="0.05"
          value={layer.lineHeight}
          onChange={(event) => onChange({ lineHeight: Number(event.target.value) })}
          className="w-full accent-blue-500"
        />
        <div className="text-right text-xs text-gray-400">{layer.lineHeight.toFixed(2)}</div>
      </div>
      <div className="col-span-2">
        <label className="text-xs text-gray-400 block mb-1">Text Box Width</label>
        <input
          type="number"
          min="80"
          value={widthDraft}
          onChange={(event) => setWidthDraft(event.target.value)}
          onBlur={commitWidthDraft}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.currentTarget.blur();
            }
          }}
          className="w-full bg-gray-700 rounded px-2 py-1 text-sm text-white border border-gray-600 focus:border-blue-500 outline-none"
        />
      </div>
    </div>
  );
};

const ShapeSection = ({
  layer,
  onChange,
}: {
  layer: ShapeStyleLayer;
  onChange: (patch: Partial<LayerItem>) => void;
}) => (
  <div className="space-y-3 pt-2 border-t border-gray-700">
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className="text-xs text-gray-400 block mb-1">Fill Color</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={layer.fill}
            onChange={(event) => onChange({ fill: event.target.value })}
            className="w-8 h-8 rounded cursor-pointer border-0 p-0 overflow-hidden bg-transparent"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-400 block mb-1">Stroke Color</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={layer.stroke}
            onChange={(event) => onChange({ stroke: event.target.value })}
            className="w-8 h-8 rounded cursor-pointer border-0 p-0 overflow-hidden bg-transparent"
          />
        </div>
      </div>
    </div>
    <div>
      <label className="text-xs text-gray-400 block mb-1">Stroke Width</label>
      <input
        type="range"
        min="0"
        max="20"
        value={layer.strokeWidth}
        onChange={(event) => onChange({ strokeWidth: Number(event.target.value) })}
        className="w-full accent-blue-500"
      />
    </div>
  </div>
);

const LineSection = ({
  layer,
  onChange,
}: {
  layer: LineLayer;
  onChange: (patch: Partial<LayerItem>) => void;
}) => (
  <div className="space-y-3 pt-2 border-t border-gray-700">
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className="text-xs text-gray-400 block mb-1">Line Color</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={layer.stroke}
            onChange={(event) => onChange({ stroke: event.target.value })}
            className="w-8 h-8 rounded cursor-pointer border-0 p-0 overflow-hidden bg-transparent"
          />
        </div>
      </div>
    </div>
    <div>
      <label className="text-xs text-gray-400 block mb-1">Line Width</label>
      <input
        type="range"
        min="1"
        max="50"
        value={layer.strokeWidth}
        onChange={(event) => onChange({ strokeWidth: Number(event.target.value) })}
        className="w-full accent-blue-500"
      />
      <div className="text-right text-xs text-gray-400">{layer.strokeWidth}px</div>
    </div>
  </div>
);

const DrawingSection = ({ strokeCount }: { strokeCount: number }) => (
  <div className="space-y-3 pt-2 border-t border-gray-700">
    <div className="flex items-center gap-2">
      <h4 className="text-xs font-semibold text-gray-400">Drawing Layer</h4>
      <InfoTooltip content="Brush strokes are added to this layer while it is selected." />
    </div>
    <div className="flex items-center justify-between text-xs text-gray-400">
      <span>Strokes</span>
      <span>{strokeCount}</span>
    </div>
  </div>
);

export default PropertyPanel;
