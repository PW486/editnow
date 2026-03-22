import type { LucideIcon } from 'lucide-react';
import { Circle as CircleIcon, ImagePlus, Layers3, Minus, Move, Pen, Square, Type } from 'lucide-react';
import type { ToolType } from '../types';

interface EditorToolbarProps {
  selectedTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  onAddText: () => void;
  onAddRect: () => void;
  onAddCircle: () => void;
  onAddDrawingLayer: () => void;
  onUpload: () => void;
}

const TOOL_SHORTCUTS: Record<string, string> = {
  Select: 'V',
  'Import Image': 'I',
  Brush: 'B',
  Line: 'L',
  'New Drawing Layer': 'N',
  'Add Text': 'T',
  Rectangle: 'R',
  Circle: 'O',
  Delete: 'Del',
};

const EditorToolbar = ({
  selectedTool,
  onSelectTool,
  onAddText,
  onAddRect,
  onAddCircle,
  onAddDrawingLayer,
  onUpload,
}: EditorToolbarProps) => (
  <div className="w-16 bg-gray-800 border-r border-gray-700 flex flex-col items-center py-4 gap-3 z-10">
    <ToolbarButton
      icon={Move}
      isActive={selectedTool === 'select'}
      onClick={() => onSelectTool('select')}
      label="Select"
    />
    <div className="w-8 h-[1px] bg-gray-700 my-1"></div>
    <ToolbarButton
      icon={ImagePlus}
      onClick={onUpload}
      label="Import Image"
    />
    <ToolbarButton
      icon={Layers3}
      onClick={onAddDrawingLayer}
      label="New Drawing Layer"
    />
    <div className="w-8 h-[1px] bg-gray-700 my-1"></div>
    <ToolbarButton
      icon={Pen}
      isActive={selectedTool === 'brush'}
      onClick={() => onSelectTool('brush')}
      label="Brush"
    />
    <ToolbarButton
      icon={Minus}
      isActive={selectedTool === 'line'}
      onClick={() => onSelectTool('line')}
      label="Line"
    />
    <ToolbarButton
      icon={Square}
      isActive={selectedTool === 'rect'}
      onClick={onAddRect}
      label="Rectangle"
    />
    <ToolbarButton
      icon={CircleIcon}
      isActive={selectedTool === 'circle'}
      onClick={onAddCircle}
      label="Circle"
    />
    <ToolbarButton
      icon={Type}
      isActive={selectedTool === 'text'}
      onClick={onAddText}
      label="Add Text"
    />
  </div>
);

interface ToolbarButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  iconClassName?: string;
}

const ToolbarButton = ({
  icon: Icon,
  label,
  onClick,
  isActive = false,
  disabled = false,
  iconClassName,
}: ToolbarButtonProps) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={TOOL_SHORTCUTS[label] ? `${label} (${TOOL_SHORTCUTS[label]})` : label}
    className={`p-3 rounded-lg transition-all duration-200 group relative
      ${isActive
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
        : 'text-gray-400 hover:bg-gray-700 hover:text-white'
      }
      ${disabled ? 'opacity-30 cursor-not-allowed' : ''}
    `}
  >
    <Icon className={iconClassName} />
    <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-gray-700">
      {TOOL_SHORTCUTS[label] ? `${label} • ${TOOL_SHORTCUTS[label]}` : label}
    </span>
  </button>
);

export default EditorToolbar;
