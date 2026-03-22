import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
  ChevronUp,
  Circle as CircleIcon,
  Copy,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Layers,
  Lock,
  Pen,
  Settings,
  Square,
  Trash2,
  Type,
  Unlock,
} from 'lucide-react';
import type { ActivePanel, LayerItem } from '../types';
import PropertyPanel from './PropertyPanel';

interface EditorSidebarProps {
  activePanel: ActivePanel;
  canvasSize: { width: number; height: number };
  layers: LayerItem[];
  selectedIds: string[];
  selectedNestedLayerId: string | null;
  selectedLayer: LayerItem | null;
  onPanelChange: (panel: ActivePanel) => void;
  onSelectLayer: (layerId: string, additive?: boolean) => void;
  onSelectNestedLayer: (groupId: string, layerId: string) => void;
  onMoveLayer: (layerId: string, direction: 'up' | 'down') => void;
  onReorderLayer: (layerId: string, position: 'front' | 'back') => void;
  onDuplicateLayer: (layerId: string) => void;
  onDeleteLayer: (layerId: string) => void;
  onToggleLayerVisibility: (layerId: string) => void;
  onToggleLayerLock: (layerId: string) => void;
  onLayerChange: (updatedLayer: LayerItem) => void;
  onAlignLayer: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  onBulkVisibility: (visible: boolean) => void;
  onBulkLock: (locked: boolean) => void;
  onDeleteSelected: () => void;
  onAlignSelection: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  onDistributeSelection: (axis: 'horizontal' | 'vertical') => void;
  onGroupSelection: () => void;
  onUngroupSelection: () => void;
}

const EditorSidebar = ({
  activePanel,
  canvasSize,
  layers,
  selectedIds,
  selectedNestedLayerId,
  selectedLayer,
  onPanelChange,
  onSelectLayer,
  onSelectNestedLayer,
  onMoveLayer,
  onReorderLayer,
  onDuplicateLayer,
  onDeleteLayer,
  onToggleLayerVisibility,
  onToggleLayerLock,
  onLayerChange,
  onAlignLayer,
  onBulkVisibility,
  onBulkLock,
  onDeleteSelected,
  onAlignSelection,
  onDistributeSelection,
  onGroupSelection,
  onUngroupSelection,
}: EditorSidebarProps) => {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    startY: number;
    startProperties: number;
  } | null>(null);
  const [propertiesHeight, setPropertiesHeight] = useState(56);

  useEffect(() => {
    const handlePointerMove = (event: MouseEvent) => {
      const dragState = dragStateRef.current;
      const sidebar = sidebarRef.current;
      if (!dragState || !sidebar) {
        return;
      }

      const totalHeight = sidebar.clientHeight;
      if (totalHeight <= 0) {
        return;
      }

      const deltaPercent = (event.clientY - dragState.startY) / totalHeight * 100;
      const nextProperties = Math.min(78, Math.max(24, dragState.startProperties + deltaPercent));
      if (100 - nextProperties < 16) {
        return;
      }
      setPropertiesHeight(nextProperties);
    };

    const handlePointerUp = () => {
      dragStateRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
    };
  }, []);

  const startResize = (clientY: number) => {
    dragStateRef.current = {
      startY: clientY,
      startProperties: propertiesHeight,
    };
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };

  const renderLayerIcon = (layer: LayerItem) => {
    if (layer.type === 'image') {
      return <ImageIcon className="w-4 h-4" />;
    }
    if (layer.type === 'text') {
      return <Type className="w-4 h-4" />;
    }
    if (layer.type === 'rect') {
      return <Square className="w-4 h-4" />;
    }
    if (layer.type === 'circle') {
      return <CircleIcon className="w-4 h-4" />;
    }
    if (layer.type === 'line' || layer.type === 'drawing') {
      return <Pen className="w-4 h-4" />;
    }

    return <Layers className="w-4 h-4" />;
  };

  const renderLayerMeta = (layer: LayerItem) => {
    let meta = layer.type;
    if (layer.type === 'group') {
      meta += ` • ${layer.children.length} items`;
    }
    if (layer.type === 'drawing') {
      meta += ` • ${layer.strokes.length} stroke${layer.strokes.length === 1 ? '' : 's'}`;
    }
    if (layer.locked) {
      meta += ' • locked';
    }
    if (!layer.visible) {
      meta += ' • hidden';
    }
    return meta;
  };

  const renderLayerTree = (layer: LayerItem, depth = 0, nested = false, parentGroupId?: string): React.ReactNode => (
    <div key={`${nested ? 'child' : 'layer'}-${layer.id}`} className="space-y-1">
      <div
        onClick={nested ? () => onSelectNestedLayer(parentGroupId ?? '', layer.id) : (event) => onSelectLayer(layer.id, event.shiftKey || event.metaKey || event.ctrlKey)}
        className={`flex items-center gap-3 rounded border p-2 ${nested ? selectedNestedLayerId === layer.id ? 'cursor-pointer border-cyan-500/50 bg-cyan-500/10' : 'cursor-pointer border-gray-800 bg-gray-900/40 hover:bg-gray-800/70' : selectedIds.includes(layer.id) ? 'cursor-pointer border-blue-600/50 bg-blue-600/20 group' : 'cursor-pointer border-transparent hover:bg-gray-700 group'} ${!layer.visible ? 'opacity-60' : ''}`}
        style={{ marginLeft: depth * 14 }}
      >
        <div className="flex items-center gap-2 text-gray-400">
          {nested && <ChevronRight className="w-3 h-3 text-gray-600" />}
          {renderLayerIcon(layer)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate text-gray-200">{layer.name}</p>
          <p className="text-[10px] text-gray-500 uppercase">{renderLayerMeta(layer)}</p>
        </div>
        {!nested && (
          <div className="opacity-0 group-hover:opacity-100 flex items-center shrink-0">
            <button
              onClick={(event) => {
                event.stopPropagation();
                onToggleLayerVisibility(layer.id);
              }}
              className="p-1 hover:text-white text-gray-500"
              title={layer.visible ? 'Hide layer' : 'Show layer'}
            >
              {layer.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                onToggleLayerLock(layer.id);
              }}
              className="p-1 hover:text-white text-gray-500"
              title={layer.locked ? 'Unlock layer' : 'Lock layer'}
            >
              {layer.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            </button>
          </div>
        )}
      </div>
      {!nested && selectedIds.includes(layer.id) && (
        <div
          className="grid grid-cols-6 gap-1"
          style={{ marginLeft: depth * 14 + 10 }}
        >
          <button
            onClick={() => onDuplicateLayer(layer.id)}
            className="flex items-center justify-center rounded bg-gray-800 px-2 py-1 text-gray-300 hover:bg-gray-700"
            title="Duplicate layer"
          >
            <Copy className="h-3 w-3" />
          </button>
          <button
            onClick={() => onDeleteLayer(layer.id)}
            className="flex items-center justify-center rounded bg-gray-800 px-2 py-1 text-gray-300 hover:bg-red-500/20 hover:text-red-200"
            title="Delete layer"
          >
            <Trash2 className="h-3 w-3" />
          </button>
          <button
            onClick={() => onReorderLayer(layer.id, 'front')}
            className="flex items-center justify-center rounded bg-gray-800 px-2 py-1 text-gray-300 hover:bg-gray-700"
            title="Bring to front"
          >
            <ChevronsUp className="h-3 w-3" />
          </button>
          <button
            onClick={() => onReorderLayer(layer.id, 'back')}
            className="flex items-center justify-center rounded bg-gray-800 px-2 py-1 text-gray-300 hover:bg-gray-700"
            title="Send to back"
          >
            <ChevronsDown className="h-3 w-3" />
          </button>
          <button
            onClick={() => onMoveLayer(layer.id, 'up')}
            className="flex items-center justify-center rounded bg-gray-800 px-2 py-1 text-gray-300 hover:bg-gray-700"
            title="Move up"
          >
            <ChevronUp className="h-3 w-3" />
          </button>
          <button
            onClick={() => onMoveLayer(layer.id, 'down')}
            className="flex items-center justify-center rounded bg-gray-800 px-2 py-1 text-gray-300 hover:bg-gray-700"
            title="Move down"
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      )}
      {layer.type === 'group' && layer.children.length > 0 && (
        <div className="space-y-1 border-l border-gray-700/60 ml-3 pl-2">
          {[...layer.children].reverse().map((child) => renderLayerTree(child, depth + 1, true, layer.id))}
        </div>
      )}
    </div>
  );

  return (
    <div ref={sidebarRef} className="w-[19rem] bg-gray-800 border-l border-gray-700 flex flex-col z-10">
      <div className="flex h-full min-h-0 flex-col">
        <section
          className="flex min-h-0 flex-col border-b border-gray-700"
          style={{ flexBasis: `${propertiesHeight}%` }}
        >
          <button
            onClick={() => onPanelChange('properties')}
            className={`flex items-center justify-between px-4 py-3 text-left text-sm font-medium ${activePanel === 'properties' ? 'bg-gray-750 text-white' : 'text-gray-300 hover:bg-gray-750/70'}`}
          >
            <span className="flex items-center gap-2">
              <Settings className="h-4 w-4" /> Properties
            </span>
            <span className="text-[10px] text-gray-500">
              {selectedLayer ? 'Selected' : 'None'}
            </span>
          </button>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <PropertyPanel
              selectedLayer={selectedLayer}
              selectedCount={selectedIds.length}
              isNestedSelection={selectedNestedLayerId !== null}
              canvasSize={canvasSize}
              onChange={onLayerChange}
              onAlign={onAlignLayer}
              onBulkVisibility={onBulkVisibility}
              onBulkLock={onBulkLock}
              onDeleteSelected={onDeleteSelected}
              onAlignSelection={onAlignSelection}
              onDistributeSelection={onDistributeSelection}
              onGroupSelection={onGroupSelection}
              onUngroupSelection={onUngroupSelection}
            />
          </div>
        </section>

        <button
          onMouseDown={(event) => startResize(event.clientY)}
          className="h-2 border-b border-gray-700 bg-gray-800 hover:bg-gray-700 cursor-row-resize"
          aria-label="Resize properties and layers panels"
        />

        <section className="flex min-h-0 flex-1 flex-col">
          <button
            onClick={() => onPanelChange('layers')}
            className={`flex items-center justify-between px-4 py-3 text-left text-sm font-medium ${activePanel === 'layers' ? 'bg-gray-750 text-white' : 'text-gray-300 hover:bg-gray-750/70'}`}
          >
            <span className="flex items-center gap-2">
              <Layers className="h-4 w-4" /> Layers
            </span>
            <span className="text-[10px] text-gray-500">{layers.length}</span>
          </button>
          <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-2">
            {layers.length === 0 && (
              <div className="text-gray-500 text-xs text-center py-8">
                No layers added yet.
              </div>
            )}
            {[...layers].reverse().map((layer) => renderLayerTree(layer))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default EditorSidebar;
