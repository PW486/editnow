import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
}: EditorToolbarProps) => {
  const [tooltip, setTooltip] = useState<{ label: string; top: number; left: number } | null>(null);

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

  const showTooltip = (event: React.MouseEvent<HTMLButtonElement> | React.FocusEvent<HTMLButtonElement>, label: string) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltip({
      label: TOOL_SHORTCUTS[label] ? `${label} • ${TOOL_SHORTCUTS[label]}` : label,
      top: rect.top + rect.height / 2,
      left: rect.right + 12,
    });
  };

  const hideTooltip = () => {
    setTooltip(null);
  };

  return (
    <>
      <div className="w-16 bg-gray-800 border-r border-gray-700 flex flex-col items-center py-4 gap-3 z-10">
        <ToolbarButton
          icon={Move}
          isActive={selectedTool === 'select'}
          onClick={() => onSelectTool('select')}
          onShowTooltip={showTooltip}
          onHideTooltip={hideTooltip}
          label="Select"
        />
        <ToolbarButton
          icon={ImagePlus}
          onClick={onUpload}
          onShowTooltip={showTooltip}
          onHideTooltip={hideTooltip}
          label="Import Image"
        />
        <ToolbarButton
          icon={Layers3}
          onClick={onAddDrawingLayer}
          onShowTooltip={showTooltip}
          onHideTooltip={hideTooltip}
          label="New Drawing Layer"
        />
        <ToolbarButton
          icon={Pen}
          isActive={selectedTool === 'brush'}
          onClick={() => onSelectTool('brush')}
          onShowTooltip={showTooltip}
          onHideTooltip={hideTooltip}
          label="Brush"
        />
        <div className="w-8 h-[1px] bg-gray-700 my-1"></div>
        <ToolbarButton
          icon={Minus}
          isActive={selectedTool === 'line'}
          onClick={() => onSelectTool('line')}
          onShowTooltip={showTooltip}
          onHideTooltip={hideTooltip}
          label="Line"
        />
        <ToolbarButton
          icon={Square}
          isActive={selectedTool === 'rect'}
          onClick={onAddRect}
          onShowTooltip={showTooltip}
          onHideTooltip={hideTooltip}
          label="Rectangle"
        />
        <ToolbarButton
          icon={CircleIcon}
          isActive={selectedTool === 'circle'}
          onClick={onAddCircle}
          onShowTooltip={showTooltip}
          onHideTooltip={hideTooltip}
          label="Circle"
        />
        <ToolbarButton
          icon={Type}
          isActive={selectedTool === 'text'}
          onClick={onAddText}
          onShowTooltip={showTooltip}
          onHideTooltip={hideTooltip}
          label="Add Text"
        />
      </div>
      {tooltip && createPortal(
        <div
          className="pointer-events-none fixed z-[100] rounded-md border border-gray-700 bg-gray-950/95 px-2.5 py-1.5 text-xs text-white shadow-lg"
          style={{
            top: tooltip.top,
            left: tooltip.left,
            transform: 'translateY(-50%)',
          }}
        >
          {tooltip.label}
        </div>,
        document.body,
      )}
    </>
  );
};

interface ToolbarButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  onShowTooltip: (event: React.MouseEvent<HTMLButtonElement> | React.FocusEvent<HTMLButtonElement>, label: string) => void;
  onHideTooltip: () => void;
  isActive?: boolean;
  disabled?: boolean;
  iconClassName?: string;
}

const ToolbarButton = ({
  icon: Icon,
  label,
  onClick,
  onShowTooltip,
  onHideTooltip,
  isActive = false,
  disabled = false,
  iconClassName,
}: ToolbarButtonProps) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={TOOL_SHORTCUTS[label] ? `${label} (${TOOL_SHORTCUTS[label]})` : label}
    onMouseEnter={(event) => onShowTooltip(event, label)}
    onMouseLeave={onHideTooltip}
    onFocus={(event) => onShowTooltip(event, label)}
    onBlur={onHideTooltip}
    className={`p-3 rounded-lg transition-all duration-200
      ${isActive
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
        : 'text-gray-400 hover:bg-gray-700 hover:text-white'
      }
      ${disabled ? 'opacity-30 cursor-not-allowed' : ''}
    `}
  >
    <Icon className={iconClassName} />
  </button>
);

export default EditorToolbar;
