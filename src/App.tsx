import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Transformer, Rect, Circle, Line, Text } from 'react-konva';
import { 
  Upload, Layers, Download, Trash2, Move, Type, 
  Square, Circle as CircleIcon, Pen, Settings,
  ChevronDown, ChevronUp, Undo, Redo
} from 'lucide-react';
import type { LayerItem, ToolType, ImageLayer, TextLayer, RectLayer, CircleLayer, LineLayer } from './types';
import PropertyPanel from './components/PropertyPanel';

const App: React.FC = () => {
  // --- STATE ---
  // History Management
  const [history, setHistory] = useState<LayerItem[][]>([[]]);
  const [historyStep, setHistoryStep] = useState(0);

  const [layers, setLayers] = useState<LayerItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<ToolType>('select');
  
  // Canvas Config
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [bgColor, setBgColor] = useState('#ffffff');

  // Drawing State
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingColor, setDrawingColor] = useState('#000000');
  const [drawingSize, setDrawingSize] = useState(5);

  // UI State
  const [activePanel, setActivePanel] = useState<'layers' | 'properties'>('layers');

  // Refs
  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- HISTORY LOGIC ---

  const addToHistory = (newLayers: LayerItem[]) => {
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(newLayers);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
    setLayers(newLayers);
  };

  const handleUndo = () => {
    if (historyStep > 0) {
      const prevStep = historyStep - 1;
      setHistoryStep(prevStep);
      setLayers(history[prevStep]);
      setSelectedId(null); // Deselect on undo to avoid ghost transformers
    }
  };

  const handleRedo = () => {
    if (historyStep < history.length - 1) {
      const nextStep = historyStep + 1;
      setHistoryStep(nextStep);
      setLayers(history[nextStep]);
      setSelectedId(null);
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history, historyStep]);

  // --- EFFECTS ---

  // Handle Transformer Selection
  useEffect(() => {
    if (selectedId && transformerRef.current && stageRef.current) {
      const node = stageRef.current.findOne('#' + selectedId);
      if (node) {
        transformerRef.current.nodes([node]);
        transformerRef.current.getLayer().batchDraw();
      }
    }
  }, [selectedId, layers]);

  // Handle Tool Change cleanup
  useEffect(() => {
    if (tool !== 'select') {
      setSelectedId(null);
      transformerRef.current?.nodes([]);
    }
  }, [tool]);

  // --- ACTIONS ---

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const img = new window.Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const newLayer: ImageLayer = {
          id: `img-${Date.now()}`,
          type: 'image',
          image: img,
          x: canvasSize.width / 2 - img.width / 4,
          y: canvasSize.height / 2 - img.height / 4,
          width: img.width / 2,
          height: img.height / 2,
          rotation: 0,
          name: file.name,
          visible: true
        };
        addToHistory([...layers, newLayer]);
        setSelectedId(newLayer.id);
        setTool('select');
      };
    }
  };

  const addText = () => {
    const newLayer: TextLayer = {
      id: `text-${Date.now()}`,
      type: 'text',
      text: 'Double click to edit',
      x: canvasSize.width / 2 - 100,
      y: canvasSize.height / 2,
      rotation: 0,
      fontSize: 24,
      fontFamily: 'Arial',
      fill: '#000000',
      name: 'Text Layer',
      visible: true
    };
    addToHistory([...layers, newLayer]);
    setSelectedId(newLayer.id);
    setTool('select');
    setActivePanel('properties');
  };

  const addRect = () => {
    const newLayer: RectLayer = {
      id: `rect-${Date.now()}`,
      type: 'rect',
      x: canvasSize.width / 2 - 50,
      y: canvasSize.height / 2 - 50,
      width: 100,
      height: 100,
      rotation: 0,
      fill: '#3b82f6',
      stroke: '#2563eb',
      strokeWidth: 2,
      name: 'Rectangle',
      visible: true
    };
    addToHistory([...layers, newLayer]);
    setSelectedId(newLayer.id);
    setTool('select');
    setActivePanel('properties');
  };

  const addCircle = () => {
    const newLayer: CircleLayer = {
      id: `circle-${Date.now()}`,
      type: 'circle',
      x: canvasSize.width / 2,
      y: canvasSize.height / 2,
      radius: 50,
      rotation: 0,
      fill: '#ef4444',
      stroke: '#dc2626',
      strokeWidth: 2,
      name: 'Circle',
      visible: true
    };
    addToHistory([...layers, newLayer]);
    setSelectedId(newLayer.id);
    setTool('select');
    setActivePanel('properties');
  };

  const handleDelete = () => {
    if (selectedId) {
      addToHistory(layers.filter(l => l.id !== selectedId));
      setSelectedId(null);
      transformerRef.current?.nodes([]);
    }
  };

  const handleExport = () => {
    if (stageRef.current) {
      const transformer = transformerRef.current;
      transformer?.nodes([]); // Hide transformer
      
      const uri = stageRef.current.toDataURL({
        pixelRatio: 2 // High quality
      });
      
      const link = document.createElement('a');
      link.download = 'editnow-export.png';
      link.href = uri;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Restore selection
      if (selectedId) {
        const node = stageRef.current.findOne('#' + selectedId);
        if (node) transformer?.nodes([node]);
      }
    }
  };

  // --- MOUSE EVENTS FOR DRAWING ---

  const handleMouseDown = (e: any) => {
    if (tool === 'select') {
      const clickedOnEmpty = e.target === e.target.getStage();
      if (clickedOnEmpty) {
        setSelectedId(null);
        transformerRef.current?.nodes([]);
      }
      return;
    }

    if (tool === 'brush') {
      setIsDrawing(true);
      const pos = e.target.getStage().getPointerPosition();
      const newLayer: LineLayer = {
        id: `line-${Date.now()}`,
        type: 'line',
        points: [pos.x, pos.y],
        stroke: drawingColor,
        strokeWidth: drawingSize,
        tension: 0.5,
        lineCap: 'round',
        lineJoin: 'round',
        x: 0,
        y: 0,
        rotation: 0,
        name: 'Drawing',
        visible: true
      };
      // Note: We don't add to history yet, just update local state for preview
      setLayers([...layers, newLayer]);
    }
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing || tool !== 'brush') return;
    
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    
    // Update last layer
    const lastLayer = layers[layers.length - 1] as LineLayer;
    if (lastLayer && lastLayer.type === 'line') {
      const newPoints = lastLayer.points.concat([point.x, point.y]);
      const newLayers = [...layers];
      newLayers[newLayers.length - 1] = { ...lastLayer, points: newPoints };
      setLayers(newLayers);
    }
  };

  const handleMouseUp = () => {
    if (isDrawing) {
      setIsDrawing(false);
      // Now we commit to history
      addToHistory(layers);
    }
  };

  // --- UPDATE LAYER PROP ---
  const handleLayerUpdate = (updatedLayer: LayerItem) => {
    // For property updates, we want to add to history
    // But maybe debounce if it's too frequent? For now, simplistic approach:
    addToHistory(layers.map(l => l.id === updatedLayer.id ? updatedLayer : l));
  };

  const getSelectedLayer = () => layers.find(l => l.id === selectedId) || null;

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden font-sans">
      
      {/* --- LEFT TOOLBAR --- */}
      <div className="w-16 bg-gray-800 border-r border-gray-700 flex flex-col items-center py-4 gap-3 z-10">
        <ToolbarButton 
          icon={<Move />} 
          isActive={tool === 'select'} 
          onClick={() => setTool('select')} 
          label="Select" 
        />
        <div className="w-8 h-[1px] bg-gray-700 my-1"></div>
        <ToolbarButton 
          icon={<Pen />} 
          isActive={tool === 'brush'} 
          onClick={() => setTool('brush')} 
          label="Brush" 
        />
        <ToolbarButton 
          icon={<Type />} 
          isActive={tool === 'text'} 
          onClick={addText} 
          label="Add Text" 
        />
        <ToolbarButton 
          icon={<Square />} 
          isActive={tool === 'rect'} 
          onClick={addRect} 
          label="Rectangle" 
        />
        <ToolbarButton 
          icon={<CircleIcon />} 
          isActive={tool === 'circle'} 
          onClick={addCircle} 
          label="Circle" 
        />
        <div className="w-8 h-[1px] bg-gray-700 my-1"></div>
        <ToolbarButton 
          icon={<Upload />} 
          onClick={() => fileInputRef.current?.click()} 
          label="Upload" 
        />
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleImageUpload} 
          className="hidden" 
          accept="image/*"
        />
        <div className="flex-1" />
        <ToolbarButton 
          icon={<Trash2 className="text-red-400" />} 
          onClick={handleDelete} 
          disabled={!selectedId}
          label="Delete" 
        />
      </div>

      {/* --- CENTER AREA --- */}
      <div className="flex-1 flex flex-col relative bg-gray-950">
        
        {/* Top Bar */}
        <div className="h-14 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <h1 className="font-bold text-xl bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mr-4">
              EditNow
            </h1>
            
            {/* History Controls */}
            <div className="flex items-center gap-1 bg-gray-900 rounded-md border border-gray-700 p-1">
              <button 
                onClick={handleUndo} 
                disabled={historyStep === 0}
                className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                title="Undo (Ctrl+Z)"
              >
                <Undo className="w-4 h-4" />
              </button>
              <button 
                onClick={handleRedo}
                disabled={historyStep === history.length - 1}
                className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                title="Redo (Ctrl+Shift+Z)"
              >
                <Redo className="w-4 h-4" />
              </button>
            </div>
            
            {/* Canvas Settings */}
            <div className="flex items-center gap-2 bg-gray-900 px-3 py-1.5 rounded-md border border-gray-700">
              <span className="text-xs text-gray-400">W:</span>
              <input 
                type="number" 
                value={canvasSize.width} 
                onChange={(e) => setCanvasSize({...canvasSize, width: Number(e.target.value)})}
                className="w-16 bg-transparent text-sm outline-none text-center"
              />
              <span className="text-xs text-gray-400 border-l border-gray-700 pl-2">H:</span>
              <input 
                type="number" 
                value={canvasSize.height} 
                onChange={(e) => setCanvasSize({...canvasSize, height: Number(e.target.value)})}
                className="w-16 bg-transparent text-sm outline-none text-center"
              />
            </div>

            {/* Background Color */}
             <div className="flex items-center gap-2 bg-gray-900 px-3 py-1.5 rounded-md border border-gray-700">
              <span className="text-xs text-gray-400">BG:</span>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={bgColor} 
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent"
                />
              </div>
            </div>

            {/* Brush Settings (Only when brush active) */}
            {tool === 'brush' && (
              <div className="flex items-center gap-3 ml-4 animate-fade-in">
                 <div className="h-6 w-[1px] bg-gray-600"></div>
                 <span className="text-xs text-gray-400">Brush:</span>
                 <input 
                  type="color" 
                  value={drawingColor} 
                  onChange={(e) => setDrawingColor(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent"
                />
                <input 
                  type="range" 
                  min="1" max="50" 
                  value={drawingSize} 
                  onChange={(e) => setDrawingSize(Number(e.target.value))}
                  className="w-20 accent-blue-500"
                />
              </div>
            )}
          </div>

          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-medium transition-colors text-sm shadow-lg shadow-blue-900/20"
          >
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
        
        {/* Workspace */}
        <div className="flex-1 overflow-auto bg-gray-900/50 p-8 flex items-center justify-center relative">
          {/* Canvas Wrapper for centering */}
          <div className="shadow-2xl relative" style={{ width: canvasSize.width, height: canvasSize.height }}>
            <div className="absolute inset-0 pointer-events-none border border-gray-700 z-0"></div>
            
            <Stage
              width={canvasSize.width}
              height={canvasSize.height}
              ref={stageRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="z-10"
            >
              <Layer>
                {/* Background Color Rect */}
                <Rect
                  x={0}
                  y={0}
                  width={canvasSize.width}
                  height={canvasSize.height}
                  fill={bgColor}
                  listening={false}
                />
                
                {layers.map((layer) => {
                  if (!layer.visible) return null;

                  const commonProps = {
                    key: layer.id,
                    id: layer.id,
                    x: layer.x,
                    y: layer.y,
                    rotation: layer.rotation,
                    draggable: tool === 'select',
                    onClick: () => {
                       if(tool === 'select') {
                         setSelectedId(layer.id);
                         setActivePanel('properties');
                       }
                    },
                    onTap: () => {
                       if(tool === 'select') {
                         setSelectedId(layer.id);
                         setActivePanel('properties');
                       }
                    },
                    onDragEnd: (e: any) => {
                      const newLayers = [...layers];
                      const idx = layers.findIndex(l => l.id === layer.id);
                      newLayers[idx] = { ...layer, x: e.target.x(), y: e.target.y() };
                      addToHistory(newLayers); // Commit drag end to history
                    },
                    onTransformEnd: (e: any) => {
                       const node = e.target;
                       const scaleX = node.scaleX();
                       const scaleY = node.scaleY();
                       
                       // Reset scale to 1 and update actual width/height
                       node.scaleX(1);
                       node.scaleY(1);

                       const newLayers = [...layers];
                       const idx = layers.findIndex(l => l.id === layer.id);
                       
                       const updated = {
                         ...layer,
                         x: node.x(),
                         y: node.y(),
                         rotation: node.rotation(),
                       } as any;

                       if (layer.type === 'rect' || layer.type === 'image') {
                         updated.width = Math.max(5, node.width() * scaleX);
                         updated.height = Math.max(5, node.height() * scaleY);
                       } else if (layer.type === 'circle') {
                         updated.radius = Math.max(5, (node.width() * scaleX) / 2);
                       } else if (layer.type === 'text') {
                          updated.fontSize = Math.max(5, (layer as TextLayer).fontSize * scaleY);
                       }

                       newLayers[idx] = updated;
                       addToHistory(newLayers); // Commit transform end to history
                    }
                  };

                  if (layer.type === 'image') {
                    return <KonvaImage {...commonProps} image={(layer as ImageLayer).image} width={(layer as ImageLayer).width} height={(layer as ImageLayer).height} />;
                  } else if (layer.type === 'rect') {
                    return <Rect {...commonProps} width={(layer as RectLayer).width} height={(layer as RectLayer).height} fill={(layer as RectLayer).fill} stroke={(layer as RectLayer).stroke} strokeWidth={(layer as RectLayer).strokeWidth} />;
                  } else if (layer.type === 'circle') {
                    return <Circle {...commonProps} radius={(layer as CircleLayer).radius} fill={(layer as CircleLayer).fill} stroke={(layer as CircleLayer).stroke} strokeWidth={(layer as CircleLayer).strokeWidth} />;
                  } else if (layer.type === 'line') {
                    return <Line {...commonProps} points={(layer as LineLayer).points} stroke={(layer as LineLayer).stroke} strokeWidth={(layer as LineLayer).strokeWidth} tension={(layer as LineLayer).tension} lineCap={(layer as LineLayer).lineCap} lineJoin={(layer as LineLayer).lineJoin} />;
                  } else if (layer.type === 'text') {
                    return <Text {...commonProps} text={(layer as TextLayer).text} fontSize={(layer as TextLayer).fontSize} fontFamily={(layer as TextLayer).fontFamily} fill={(layer as TextLayer).fill} />;
                  }
                  return null;
                })}
                <Transformer
                  ref={transformerRef}
                  boundBoxFunc={(oldBox, newBox) => {
                    if (newBox.width < 5 || newBox.height < 5) return oldBox;
                    return newBox;
                  }}
                  anchorSize={8}
                  anchorCornerRadius={4}
                  borderStroke="#3b82f6"
                  anchorStroke="#3b82f6"
                  anchorFill="#ffffff"
                />
              </Layer>
            </Stage>
          </div>
        </div>
      </div>

      {/* --- RIGHT SIDEBAR --- */}
      <div className="w-72 bg-gray-800 border-l border-gray-700 flex flex-col z-10">
        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button 
            onClick={() => setActivePanel('layers')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activePanel === 'layers' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-750'}`}
          >
            <Layers className="w-4 h-4" /> Layers
          </button>
          <button 
            onClick={() => setActivePanel('properties')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activePanel === 'properties' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-750'}`}
          >
            <Settings className="w-4 h-4" /> Properties
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activePanel === 'layers' ? (
            <div className="p-2 space-y-1">
               {layers.length === 0 && (
                <div className="text-gray-500 text-xs text-center py-8">
                  No layers added yet.
                </div>
              )}
              {[...layers].reverse().map((layer) => (
                <div 
                  key={layer.id}
                  onClick={() => {
                    setSelectedId(layer.id);
                    setTool('select');
                  }}
                  className={`flex items-center gap-3 p-2 rounded cursor-pointer group ${selectedId === layer.id ? 'bg-blue-600/20 border border-blue-600/50' : 'hover:bg-gray-700 border border-transparent'}`}
                >
                  <div className="text-gray-400">
                    {layer.type === 'image' && <Upload className="w-4 h-4" />}
                    {layer.type === 'text' && <Type className="w-4 h-4" />}
                    {layer.type === 'rect' && <Square className="w-4 h-4" />}
                    {layer.type === 'circle' && <CircleIcon className="w-4 h-4" />}
                    {layer.type === 'line' && <Pen className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-gray-200">{layer.name}</p>
                    <p className="text-[10px] text-gray-500 uppercase">{layer.type}</p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 flex items-center">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        // Simple move up logic
                        const idx = layers.findIndex(l => l.id === layer.id);
                        if (idx < layers.length - 1) {
                           const newLayers = [...layers];
                           [newLayers[idx], newLayers[idx + 1]] = [newLayers[idx + 1], newLayers[idx]];
                           addToHistory(newLayers); // Commit reorder
                        }
                      }}
                      className="p-1 hover:text-white text-gray-500"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        // Simple move down logic
                        const idx = layers.findIndex(l => l.id === layer.id);
                        if (idx > 0) {
                           const newLayers = [...layers];
                           [newLayers[idx], newLayers[idx - 1]] = [newLayers[idx - 1], newLayers[idx]];
                           addToHistory(newLayers); // Commit reorder
                        }
                      }}
                      className="p-1 hover:text-white text-gray-500"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <PropertyPanel 
              selectedLayer={getSelectedLayer()} 
              onChange={handleLayerUpdate} 
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Helper Component for Toolbar Buttons
const ToolbarButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  isActive?: boolean;
  disabled?: boolean;
}> = ({ icon, label, onClick, isActive, disabled }) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    title={label}
    className={`p-3 rounded-lg transition-all duration-200 group relative
      ${isActive 
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
        : 'text-gray-400 hover:bg-gray-700 hover:text-white'
      }
      ${disabled ? 'opacity-30 cursor-not-allowed' : ''}
    `}
  >
    {icon}
    {/* Tooltip */}
    <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-gray-700">
      {label}
    </span>
  </button>
);

export default App;
