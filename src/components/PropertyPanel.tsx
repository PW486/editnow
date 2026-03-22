import React from 'react';
import type { LayerItem, TextLayer, RectLayer, LineLayer } from '../types';

interface PropertyPanelProps {
  selectedLayer: LayerItem | null;
  onChange: (updated: LayerItem) => void;
}

const PropertyPanel: React.FC<PropertyPanelProps> = ({ selectedLayer, onChange }) => {
  if (!selectedLayer) return <div className="p-4 text-gray-500 text-sm">No layer selected.</div>;

  const handleChange = (key: string, value: any) => {
    onChange({ ...selectedLayer, [key]: value } as LayerItem);
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Properties</h3>
      
      {/* Generic Properties */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-400 block mb-1">X Position</label>
          <input 
            type="number" 
            value={Math.round(selectedLayer.x)} 
            onChange={(e) => handleChange('x', Number(e.target.value))}
            className="w-full bg-gray-700 rounded px-2 py-1 text-sm text-white border border-gray-600 focus:border-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Y Position</label>
          <input 
            type="number" 
            value={Math.round(selectedLayer.y)} 
            onChange={(e) => handleChange('y', Number(e.target.value))}
            className="w-full bg-gray-700 rounded px-2 py-1 text-sm text-white border border-gray-600 focus:border-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Rotation</label>
          <input 
            type="number" 
            value={Math.round(selectedLayer.rotation)} 
            onChange={(e) => handleChange('rotation', Number(e.target.value))}
            className="w-full bg-gray-700 rounded px-2 py-1 text-sm text-white border border-gray-600 focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Specific Properties based on Type */}
      
      {/* TEXT Properties */}
      {selectedLayer.type === 'text' && (
        <div className="space-y-3 pt-2 border-t border-gray-700">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Content</label>
            <textarea 
              value={(selectedLayer as TextLayer).text} 
              onChange={(e) => handleChange('text', e.target.value)}
              className="w-full bg-gray-700 rounded px-2 py-1 text-sm text-white border border-gray-600 focus:border-blue-500 outline-none min-h-[60px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Font Size</label>
              <input 
                type="number" 
                value={(selectedLayer as TextLayer).fontSize} 
                onChange={(e) => handleChange('fontSize', Number(e.target.value))}
                className="w-full bg-gray-700 rounded px-2 py-1 text-sm text-white border border-gray-600 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Color</label>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={(selectedLayer as TextLayer).fill} 
                  onChange={(e) => handleChange('fill', e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0 p-0 overflow-hidden bg-transparent"
                />
                <span className="text-xs text-gray-300">{(selectedLayer as TextLayer).fill}</span>
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Font Family</label>
            <select 
              value={(selectedLayer as TextLayer).fontFamily}
              onChange={(e) => handleChange('fontFamily', e.target.value)}
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
        </div>
      )}

      {/* SHAPE Properties (Rect/Circle) */}
      {(selectedLayer.type === 'rect' || selectedLayer.type === 'circle') && (
        <div className="space-y-3 pt-2 border-t border-gray-700">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Fill Color</label>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={(selectedLayer as RectLayer).fill} 
                  onChange={(e) => handleChange('fill', e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0 p-0 overflow-hidden bg-transparent"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Stroke Color</label>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={(selectedLayer as RectLayer).stroke} 
                  onChange={(e) => handleChange('stroke', e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0 p-0 overflow-hidden bg-transparent"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Stroke Width</label>
            <input 
              type="range" 
              min="0" max="20"
              value={(selectedLayer as RectLayer).strokeWidth} 
              onChange={(e) => handleChange('strokeWidth', Number(e.target.value))}
              className="w-full accent-blue-500"
            />
          </div>
        </div>
      )}

      {/* LINE Properties */}
      {selectedLayer.type === 'line' && (
        <div className="space-y-3 pt-2 border-t border-gray-700">
           <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Line Color</label>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={(selectedLayer as LineLayer).stroke} 
                  onChange={(e) => handleChange('stroke', e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0 p-0 overflow-hidden bg-transparent"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Line Width</label>
             <input 
              type="range" 
              min="1" max="50"
              value={(selectedLayer as LineLayer).strokeWidth} 
              onChange={(e) => handleChange('strokeWidth', Number(e.target.value))}
              className="w-full accent-blue-500"
            />
            <div className="text-right text-xs text-gray-400">{(selectedLayer as LineLayer).strokeWidth}px</div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PropertyPanel;
