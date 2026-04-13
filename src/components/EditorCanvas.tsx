import Konva from 'konva';
import { Circle, Group, Layer, Line, Rect, Stage, Text, Transformer } from 'react-konva';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';
import type {
  CanvasSize,
  CircleLayer,
  DrawingStroke,
  ImageLayer,
  LayerItem,
  LineLayer,
  Point,
  RectLayer,
  TextLayer,
  ToolType,
  ViewTransform,
} from '../types';
import { getLayerLocalBounds } from '../lib/editorUtils';
import FilteredImage from './FilteredImage';

interface EditorCanvasProps {
  canvasSize: CanvasSize;
  bgColor: string;
  isTransparent: boolean;
  tool: ToolType;
  layers: LayerItem[];
  draftStroke: DrawingStroke | null;
  viewTransform: ViewTransform;
  stageRef: RefObject<Konva.Stage | null>;
  transformerRef: RefObject<Konva.Transformer | null>;
  onPointerDown: (position: Point | null, clickedOnEmpty: boolean) => void;
  onPointerMove: (position: Point | null) => void;
  onPointerUp: () => void;
  onViewTransformChange: (nextViewTransform: ViewTransform) => void;
  onSelectLayer: (layerId: string, additive?: boolean) => void;
  onSelectLayers: (layerIds: string[], additive?: boolean) => void;
  selectedIds: string[];
  onLayerDragEnd: (layerId: string, position: Point) => void;
  onLayerTransformEnd: (layerId: string, node: Konva.Node) => void;
  onSelectionTransformEnd: () => void;
  editingTextLayerId: string | null;
  onStartTextEdit: (layerId: string) => void;
  onCommitTextEdit: (layerId: string, text: string) => void;
  onCancelTextEdit: () => void;
  textEditorDraft: string;
  onTextEditorDraftChange: (text: string) => void;
}

interface SnapGuideState {
  vertical: number | null;
  horizontal: number | null;
}

interface MarqueeSelectionState {
  start: Point;
  current: Point;
  additive: boolean;
}

interface RulerMark {
  coordinate: number;
  position: number;
  major: boolean;
}

const SNAP_THRESHOLD = 8;
const RULER_SIZE = 24;

const EditorCanvas = ({
  canvasSize,
  bgColor,
  isTransparent,
  tool,
  layers,
  draftStroke,
  viewTransform,
  stageRef,
  transformerRef,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onViewTransformChange,
  onSelectLayer,
  onSelectLayers,
  selectedIds,
  onLayerDragEnd,
  onLayerTransformEnd,
  onSelectionTransformEnd,
  editingTextLayerId,
  onStartTextEdit,
  onCommitTextEdit,
  onCancelTextEdit,
  textEditorDraft,
  onTextEditorDraftChange,
}: EditorCanvasProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number; position: Point } | null>(null);
  const multiDragOriginsRef = useRef<Map<string, Point> | null>(null);
  const [textEditorHeight, setTextEditorHeight] = useState<number | null>(null);
  const [spacePressed, setSpacePressed] = useState(false);
  const [snapGuides, setSnapGuides] = useState<SnapGuideState>({ vertical: null, horizontal: null });
  const [marqueeSelection, setMarqueeSelection] = useState<MarqueeSelectionState | null>(null);
  const [workspaceSize, setWorkspaceSize] = useState({ width: 0, height: 0 });

  const editingTextLayer =
    editingTextLayerId !== null
      ? (layers.find((layer): layer is TextLayer => layer.id === editingTextLayerId && layer.type === 'text') ?? null)
      : null;

  const textEditorStyle = useMemo<CSSProperties | null>(() => {
    if (!editingTextLayerId || !editingTextLayer) {
      return null;
    }

    const width = Math.max(editingTextLayer.width ?? 220, 160);
    const height = Math.max(
      textEditorHeight ?? 0,
      editingTextLayer.fontSize * editingTextLayer.lineHeight,
    );

    return {
      position: 'absolute',
      left: editingTextLayer.x * viewTransform.scale + viewTransform.position.x,
      top: editingTextLayer.y * viewTransform.scale + viewTransform.position.y,
      width: width * viewTransform.scale,
      height: height * viewTransform.scale,
      padding: 0,
      margin: 0,
      border: 'none',
      outline: 'none',
      resize: 'none',
      overflow: 'hidden',
      background: 'transparent',
      color: editingTextLayer.fill,
      caretColor: editingTextLayer.fill,
      textAlign: editingTextLayer.align,
      fontFamily: editingTextLayer.fontFamily,
      fontSize: `${editingTextLayer.fontSize * viewTransform.scale}px`,
      lineHeight: String(editingTextLayer.lineHeight),
      fontWeight: '400',
      letterSpacing: 'normal',
      transform: `rotate(${editingTextLayer.rotation}deg)`,
      transformOrigin: 'left top',
      whiteSpace: 'pre-wrap',
      boxShadow: 'inset 0 0 0 1px #2563eb',
      appearance: 'none',
      WebkitAppearance: 'none',
      MozAppearance: 'none',
      zIndex: 30,
      borderRadius: '4px',
      boxSizing: 'border-box',
    };
  }, [editingTextLayer, editingTextLayerId, textEditorDraft, textEditorHeight, viewTransform]);

  useEffect(() => {
    if (!editingTextLayerId) {
      setTextEditorHeight(null);
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [editingTextLayerId]);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!editingTextLayerId || !editingTextLayer || !textarea) {
      return;
    }

    const previousHeight = textarea.style.height;
    textarea.style.height = 'auto';
    const measuredHeight = Math.max(
      textarea.scrollHeight / Math.max(viewTransform.scale, 0.01),
      editingTextLayer.fontSize * editingTextLayer.lineHeight,
    );
    textarea.style.height = previousHeight;
    setTextEditorHeight((current) => (
      current !== null && Math.abs(current - measuredHeight) < 0.5 ? current : measuredHeight
    ));
  }, [editingTextLayer, editingTextLayerId, textEditorDraft, viewTransform.scale]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        setSpacePressed(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        setSpacePressed(false);
        isPanningRef.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const element = workspaceRef.current;
    if (!element) {
      return;
    }

    const updateSize = () => {
      setWorkspaceSize({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const toCanvasPoint = (stage: Konva.Stage | null): Point | null => {
    const position = stage?.getPointerPosition();
    if (!position) {
      return null;
    }

    return {
      x: (position.x - canvasOrigin.x - viewTransform.position.x) / viewTransform.scale,
      y: (position.y - canvasOrigin.y - viewTransform.position.y) / viewTransform.scale,
    };
  };

  const getEventClientPoint = (event: MouseEvent | TouchEvent): Point | null => {
    if ('touches' in event) {
      const touch = event.touches[0] ?? event.changedTouches[0];
      if (!touch) {
        return null;
      }
      return { x: touch.clientX, y: touch.clientY };
    }

    return { x: event.clientX, y: event.clientY };
  };

  const finishTextEditing = (shouldCommit: boolean) => {
    if (!editingTextLayerId) {
      return;
    }

    const nextText = textEditorDraft.trimEnd();
    if (shouldCommit && editingTextLayer && nextText !== editingTextLayer.text) {
      onCommitTextEdit(editingTextLayerId, nextText.length > 0 ? nextText : ' ');
      return;
    }

    onCancelTextEdit();
  };

  const handleMouseDown = (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stage = event.target.getStage();
    if (editingTextLayerId === null && spacePressed) {
      isPanningRef.current = true;
      const clientPoint = getEventClientPoint(event.evt);
      if (clientPoint) {
        panStartRef.current = {
          x: clientPoint.x,
          y: clientPoint.y,
          position: viewTransform.position,
        };
      }
      return;
    }

    const position = toCanvasPoint(stage);
    const clickedOnEmpty = event.target === stage;

    if (tool === 'select' && clickedOnEmpty && position) {
      setSnapGuides({ vertical: null, horizontal: null });
      setMarqueeSelection({
        start: position,
        current: position,
        additive: Boolean(event.evt.shiftKey || event.evt.metaKey || event.evt.ctrlKey),
      });
      return;
    }

    onPointerDown(position, clickedOnEmpty);
  };

  const handleMouseMove = (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stage = event.target.getStage();
    if (isPanningRef.current && stage) {
      const clientPoint = getEventClientPoint(event.evt);
      const panStart = panStartRef.current;
      if (!clientPoint || !panStart) {
        return;
      }

      onViewTransformChange({
        scale: viewTransform.scale,
        position: {
          x: panStart.position.x + (clientPoint.x - panStart.x),
          y: panStart.position.y + (clientPoint.y - panStart.y),
        },
      });
      return;
    }

    const position = toCanvasPoint(stage);
    if (marqueeSelection && position) {
      setMarqueeSelection((current) => (
        current
          ? {
              ...current,
              current: position,
            }
          : current
      ));
      return;
    }

    onPointerMove(position);
  };

  const handleMouseUp = () => {
    isPanningRef.current = false;
    panStartRef.current = null;

    if (marqueeSelection) {
      const left = Math.min(marqueeSelection.start.x, marqueeSelection.current.x);
      const right = Math.max(marqueeSelection.start.x, marqueeSelection.current.x);
      const top = Math.min(marqueeSelection.start.y, marqueeSelection.current.y);
      const bottom = Math.max(marqueeSelection.start.y, marqueeSelection.current.y);
      const width = right - left;
      const height = bottom - top;

      if (width < 4 && height < 4) {
        onSelectLayers([], marqueeSelection.additive);
      } else {
        const hitLayerIds = layers
          .filter((layer) => {
            if (!layer.visible) {
              return false;
            }

            const bounds = getLayerLocalBounds(layer);
            const layerLeft = layer.x + bounds.left;
            const layerRight = layer.x + bounds.right;
            const layerTop = layer.y + bounds.top;
            const layerBottom = layer.y + bounds.bottom;

            return (
              layerLeft <= right &&
              layerRight >= left &&
              layerTop <= bottom &&
              layerBottom >= top
            );
          })
          .map((layer) => layer.id);

        onSelectLayers(hitLayerIds, marqueeSelection.additive);
      }

      setMarqueeSelection(null);
      return;
    }

    onPointerUp();
  };

  const handleWheel = (event: Konva.KonvaEventObject<WheelEvent>) => {
    event.evt.preventDefault();

    const stage = event.target.getStage();
    const pointer = stage?.getPointerPosition();
    if (!stage || !pointer) {
      return;
    }

    const scaleBy = 1.08;
    const oldScale = viewTransform.scale;
    const direction = event.evt.deltaY > 0 ? -1 : 1;
    const nextScale = direction > 0
      ? Math.min(oldScale * scaleBy, 4)
      : Math.max(oldScale / scaleBy, 0.25);

    const mousePointTo = {
      x: (pointer.x - canvasOrigin.x - viewTransform.position.x) / oldScale,
      y: (pointer.y - canvasOrigin.y - viewTransform.position.y) / oldScale,
    };

    onViewTransformChange({
      scale: nextScale,
      position: {
        x: pointer.x - canvasOrigin.x - mousePointTo.x * nextScale,
        y: pointer.y - canvasOrigin.y - mousePointTo.y * nextScale,
      },
    });
  };

  const getLayerBounds = (layer: LayerItem, node: Konva.Node) => {
    const x = node.x();
    const y = node.y();
    const localBounds = getLayerLocalBounds(layer);
    return {
      left: x + localBounds.left,
      right: x + localBounds.right,
      top: y + localBounds.top,
      bottom: y + localBounds.bottom,
    };
  };

  const getSnappedPosition = (layer: LayerItem, node: Konva.Node) => {
    const bounds = getLayerBounds(layer, node);
    const centerX = (bounds.left + bounds.right) / 2;
    const centerY = (bounds.top + bounds.bottom) / 2;
    const nodeX = node.x();
    const nodeY = node.y();
    const verticalCandidates = [0, canvasSize.width / 2, canvasSize.width];
    const horizontalCandidates = [0, canvasSize.height / 2, canvasSize.height];

    for (const otherLayer of layers) {
      if (!otherLayer.visible || otherLayer.id === layer.id) {
        continue;
      }

      const otherBounds = {
        left: otherLayer.x + getLayerLocalBounds(otherLayer).left,
        right: otherLayer.x + getLayerLocalBounds(otherLayer).right,
        top: otherLayer.y + getLayerLocalBounds(otherLayer).top,
        bottom: otherLayer.y + getLayerLocalBounds(otherLayer).bottom,
      };

      verticalCandidates.push(
        otherBounds.left,
        (otherBounds.left + otherBounds.right) / 2,
        otherBounds.right,
      );
      horizontalCandidates.push(
        otherBounds.top,
        (otherBounds.top + otherBounds.bottom) / 2,
        otherBounds.bottom,
      );
    }

    let snappedX = node.x();
    let snappedY = node.y();
    let bestVerticalGuide: number | null = null;
    let bestHorizontalGuide: number | null = null;
    let bestVerticalDiff = SNAP_THRESHOLD + 1;
    let bestHorizontalDiff = SNAP_THRESHOLD + 1;

    const xChecks = [
      { value: bounds.left, adjust: (guide: number) => nodeX + (guide - bounds.left) },
      { value: centerX, adjust: (guide: number) => nodeX + (guide - centerX) },
      { value: bounds.right, adjust: (guide: number) => nodeX + (guide - bounds.right) },
    ];

    for (const guide of verticalCandidates) {
      for (const check of xChecks) {
        const diff = Math.abs(check.value - guide);
        if (diff < bestVerticalDiff && diff <= SNAP_THRESHOLD) {
          bestVerticalDiff = diff;
          bestVerticalGuide = guide;
          snappedX = check.adjust(guide);
        }
      }
    }

    const yChecks = [
      { value: bounds.top, adjust: (guide: number) => nodeY + (guide - bounds.top) },
      { value: centerY, adjust: (guide: number) => nodeY + (guide - centerY) },
      { value: bounds.bottom, adjust: (guide: number) => nodeY + (guide - bounds.bottom) },
    ];

    for (const guide of horizontalCandidates) {
      for (const check of yChecks) {
        const diff = Math.abs(check.value - guide);
        if (diff < bestHorizontalDiff && diff <= SNAP_THRESHOLD) {
          bestHorizontalDiff = diff;
          bestHorizontalGuide = guide;
          snappedY = check.adjust(guide);
        }
      }
    }

    return {
      x: snappedX,
      y: snappedY,
      guides: {
        vertical: bestVerticalGuide,
        horizontal: bestHorizontalGuide,
      },
    };
  };

  const boardWidth = canvasSize.width + RULER_SIZE;
  const boardHeight = canvasSize.height + RULER_SIZE;
  const workspaceWidth = Math.max(workspaceSize.width, boardWidth + 96);
  const workspaceHeight = Math.max(workspaceSize.height, boardHeight + 96);
  const boardLeft = Math.max(0, Math.round((workspaceWidth - canvasSize.width) / 2) - RULER_SIZE);
  const boardTop = Math.max(0, Math.round((workspaceHeight - canvasSize.height) / 2) - RULER_SIZE);
  const canvasOrigin = { x: boardLeft + RULER_SIZE, y: boardTop + RULER_SIZE };

  const rulerStep = useMemo(() => {
    const targetPixels = 40;
    const rawStep = targetPixels / viewTransform.scale;
    const options = [10, 20, 25, 50, 100, 200, 250, 500, 1000];
    return options.find((option) => option >= rawStep) ?? 1000;
  }, [viewTransform.scale]);

  const horizontalRulerMarks = useMemo<RulerMark[]>(() => {
    const marks: RulerMark[] = [];
    const visibleStart = (-canvasOrigin.x - viewTransform.position.x) / viewTransform.scale;
    const visibleEnd = (workspaceWidth - canvasOrigin.x - viewTransform.position.x) / viewTransform.scale;
    const first = Math.floor(visibleStart / rulerStep) * rulerStep;
    const majorStep = rulerStep * 2;

    for (let coordinate = first; coordinate <= visibleEnd + rulerStep; coordinate += rulerStep) {
      const position = canvasOrigin.x + viewTransform.position.x + coordinate * viewTransform.scale;
      if (position < RULER_SIZE - 1 || position > workspaceWidth) {
        continue;
      }
      marks.push({
        coordinate,
        position: position - RULER_SIZE,
        major: coordinate % majorStep === 0,
      });
    }

    return marks;
  }, [canvasOrigin.x, rulerStep, viewTransform.position.x, viewTransform.scale, workspaceWidth]);

  const verticalRulerMarks = useMemo<RulerMark[]>(() => {
    const marks: RulerMark[] = [];
    const visibleStart = (-canvasOrigin.y - viewTransform.position.y) / viewTransform.scale;
    const visibleEnd = (workspaceHeight - canvasOrigin.y - viewTransform.position.y) / viewTransform.scale;
    const first = Math.floor(visibleStart / rulerStep) * rulerStep;
    const majorStep = rulerStep * 2;

    for (let coordinate = first; coordinate <= visibleEnd + rulerStep; coordinate += rulerStep) {
      const position = canvasOrigin.y + viewTransform.position.y + coordinate * viewTransform.scale;
      if (position < RULER_SIZE - 1 || position > workspaceHeight) {
        continue;
      }
      marks.push({
        coordinate,
        position: position - RULER_SIZE,
        major: coordinate % majorStep === 0,
      });
    }

    return marks;
  }, [canvasOrigin.y, rulerStep, viewTransform.position.y, viewTransform.scale, workspaceHeight]);

  const horizontalCanvasBand = useMemo(() => {
    const start = canvasOrigin.x + viewTransform.position.x - RULER_SIZE;
    const end = start + canvasSize.width * viewTransform.scale;
    return {
      left: Math.max(0, start),
      width: Math.max(0, Math.min(workspaceWidth - RULER_SIZE, end) - Math.max(0, start)),
    };
  }, [canvasOrigin.x, canvasSize.width, viewTransform.position.x, viewTransform.scale, workspaceWidth]);

  const verticalCanvasBand = useMemo(() => {
    const start = canvasOrigin.y + viewTransform.position.y - RULER_SIZE;
    const end = start + canvasSize.height * viewTransform.scale;
    return {
      top: Math.max(0, start),
      height: Math.max(0, Math.min(workspaceHeight - RULER_SIZE, end) - Math.max(0, start)),
    };
  }, [canvasOrigin.y, canvasSize.height, viewTransform.position.y, viewTransform.scale, workspaceHeight]);

  const canvasSurfaceStyle = useMemo<CSSProperties>(() => ({
    transform: `translate(${viewTransform.position.x}px, ${viewTransform.position.y}px) scale(${viewTransform.scale})`,
    transformOrigin: 'top left',
  }), [viewTransform.position.x, viewTransform.position.y, viewTransform.scale]);

  const workspaceStyle = useMemo<CSSProperties>(() => ({
    width: workspaceWidth,
    height: workspaceHeight,
  }), [workspaceHeight, workspaceWidth]);

  const renderLayerNode = (layer: LayerItem, nested = false): React.ReactNode => {
    if (!layer.visible) {
      return null;
    }

    const handleSelect = (event?: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (tool === 'select') {
        onSelectLayer(layer.id, Boolean(event?.evt.shiftKey || event?.evt.metaKey || event?.evt.ctrlKey));
      }
    };

    const handleDragEnd = (event: Konva.KonvaEventObject<DragEvent>) => {
      setSnapGuides({ vertical: null, horizontal: null });
      multiDragOriginsRef.current = null;
      onLayerDragEnd(layer.id, { x: event.target.x(), y: event.target.y() });
    };

    const handleDragStart = () => {
      if (!(selectedIds.includes(layer.id) && selectedIds.length > 1)) {
        multiDragOriginsRef.current = null;
        return;
      }

      multiDragOriginsRef.current = new Map(
        layers
          .filter((item) => selectedIds.includes(item.id))
          .map((item) => [item.id, { x: item.x, y: item.y }]),
      );
    };

    const handleTransformEnd = (event: Konva.KonvaEventObject<Event>) => {
      onLayerTransformEnd(layer.id, event.target);
    };

    const handleDragMove = (event: Konva.KonvaEventObject<DragEvent>) => {
      const snapped = getSnappedPosition(layer, event.target);
      event.target.position({ x: snapped.x, y: snapped.y });
      setSnapGuides(snapped.guides);

      const dragOrigins = multiDragOriginsRef.current;
      if (!dragOrigins || !selectedIds.includes(layer.id) || selectedIds.length <= 1) {
        return;
      }

      const origin = dragOrigins.get(layer.id);
      const stage = event.target.getStage();
      if (!origin || !stage) {
        return;
      }

      const dx = snapped.x - origin.x;
      const dy = snapped.y - origin.y;

      selectedIds.forEach((selectedId) => {
        if (selectedId === layer.id) {
          return;
        }

        const selectedOrigin = dragOrigins.get(selectedId);
        const node = stage.findOne(`#${selectedId}`);
        if (!selectedOrigin || !node) {
          return;
        }

        node.position({
          x: selectedOrigin.x + dx,
          y: selectedOrigin.y + dy,
        });
      });
    };

    const commonProps = {
      key: layer.id,
      id: layer.id,
      x: layer.x,
      y: layer.y,
      rotation: layer.rotation,
      opacity: layer.opacity,
      draggable: !nested && tool === 'select' && editingTextLayerId === null && !layer.locked,
      listening: !nested,
      onClick: handleSelect,
      onTap: handleSelect,
      onDragStart: handleDragStart,
      onDragMove: handleDragMove,
      onDragEnd: handleDragEnd,
      onTransformEnd: handleTransformEnd,
    };

    if (layer.type === 'group') {
      return (
        <Group {...commonProps}>
          {layer.children.map((child) => {
            const childNode = renderLayerNode({
              ...child,
              visible: true,
            }, true);
            return childNode;
          })}
        </Group>
      );
    }

    if (layer.type === 'image') {
      const imageLayer = layer as ImageLayer;
      return (
        <FilteredImage
          key={imageLayer.id}
          {...imageLayer}
          draggable={tool === 'select' && !layer.locked}
          onSelect={(event) =>
            onSelectLayer(layer.id, Boolean(event?.evt.shiftKey || event?.evt.metaKey || event?.evt.ctrlKey))
          }
          onDragMove={(position) => {
            const currentNode = stageRef.current?.findOne(`#${layer.id}`);
            if (!currentNode) {
              return;
            }
            currentNode.position(position);
            const snapped = getSnappedPosition(layer, currentNode);
            currentNode.position({ x: snapped.x, y: snapped.y });
            setSnapGuides(snapped.guides);
          }}
          onDragEnd={(position) => onLayerDragEnd(layer.id, position)}
          onTransformEnd={(node) => onLayerTransformEnd(layer.id, node)}
        />
      );
    }

    if (layer.type === 'rect') {
      const rectLayer = layer as RectLayer;
      return <Rect {...commonProps} width={rectLayer.width} height={rectLayer.height} fill={rectLayer.fill} stroke={rectLayer.stroke} strokeWidth={rectLayer.strokeWidth} />;
    }

    if (layer.type === 'circle') {
      const circleLayer = layer as CircleLayer;
      return <Circle {...commonProps} radius={circleLayer.radius} fill={circleLayer.fill} stroke={circleLayer.stroke} strokeWidth={circleLayer.strokeWidth} />;
    }

    if (layer.type === 'line') {
      const lineLayer = layer as LineLayer;
      return <Line {...commonProps} points={lineLayer.points} stroke={lineLayer.stroke} strokeWidth={lineLayer.strokeWidth} tension={lineLayer.tension} lineCap={lineLayer.lineCap} lineJoin={lineLayer.lineJoin} />;
    }

    if (layer.type === 'drawing') {
      const bounds = getLayerLocalBounds(layer);
      return (
        <Group {...commonProps}>
          <Rect
            x={bounds.left}
            y={bounds.top}
            width={Math.max(1, bounds.right - bounds.left)}
            height={Math.max(1, bounds.bottom - bounds.top)}
            fill="rgba(0,0,0,0.001)"
            strokeEnabled={false}
          />
          {layer.strokes.map((stroke, index) => (
            <Line
              key={`${layer.id}-stroke-${index}`}
              points={stroke.points}
              stroke={stroke.stroke}
              strokeWidth={stroke.strokeWidth}
              tension={stroke.tension}
              lineCap={stroke.lineCap}
              lineJoin={stroke.lineJoin}
            />
          ))}
        </Group>
      );
    }

    const textLayer = layer as TextLayer;
    return (
      <Text
        {...commonProps}
        text={textLayer.text}
        width={textLayer.width}
        align={textLayer.align}
        fontSize={textLayer.fontSize}
        fontFamily={textLayer.fontFamily}
        fill={textLayer.fill}
        lineHeight={textLayer.lineHeight}
        opacity={editingTextLayerId === textLayer.id ? 0 : 1}
        listening={editingTextLayerId !== textLayer.id}
        onDblClick={() => {
          if (!textLayer.locked) {
            onStartTextEdit(textLayer.id);
          }
        }}
        onDblTap={() => {
          if (!textLayer.locked) {
            onStartTextEdit(textLayer.id);
          }
        }}
      />
    );
  };

  return (
    <div ref={workspaceRef} data-editor-workspace="true" className="relative flex-1 min-h-0 overflow-hidden bg-gray-900/50">
      <div className="relative" style={workspaceStyle}>
        <div className="absolute left-0 top-0 z-20 flex h-6 w-6 items-center justify-center border border-gray-700 bg-gray-900 text-[10px] text-gray-500">
          0
        </div>
        <div className="absolute left-6 top-0 z-20 h-6 overflow-hidden border border-gray-700 bg-gray-900" style={{ width: workspaceWidth - RULER_SIZE }}>
          {horizontalCanvasBand.width > 0 && (
            <div
              className="absolute inset-y-0 border-x border-blue-500/30 bg-blue-500/10"
              style={{ left: horizontalCanvasBand.left, width: horizontalCanvasBand.width }}
            ></div>
          )}
          {horizontalRulerMarks.map((mark) => (
            <div
              key={`hr-${mark.coordinate}`}
              className="absolute top-0 h-full"
              style={{ left: mark.position }}
            >
              <div className={`w-px ${mark.major ? 'h-4 bg-gray-400' : 'h-2 bg-gray-500'}`}></div>
              {mark.major && (
                <span className="absolute left-1 top-1 text-[9px] text-gray-400">{mark.coordinate}</span>
              )}
            </div>
          ))}
        </div>
        <div className="absolute left-0 top-6 z-20 w-6 overflow-hidden border border-gray-700 bg-gray-900" style={{ height: workspaceHeight - RULER_SIZE }}>
          {verticalCanvasBand.height > 0 && (
            <div
              className="absolute inset-x-0 border-y border-blue-500/30 bg-blue-500/10"
              style={{ top: verticalCanvasBand.top, height: verticalCanvasBand.height }}
            ></div>
          )}
          {verticalRulerMarks.map((mark) => (
            <div
              key={`vr-${mark.coordinate}`}
              className="absolute left-0 w-full"
              style={{ top: mark.position }}
            >
              <div className={`h-px ${mark.major ? 'w-4 bg-gray-400' : 'w-2 bg-gray-500'}`}></div>
              {mark.major && (
                <span className="absolute left-1 top-1 text-[9px] text-gray-400 [writing-mode:vertical-rl]">{mark.coordinate}</span>
              )}
            </div>
          ))}
        </div>

        <div
          className="absolute"
          style={{ left: boardLeft, top: boardTop, width: boardWidth, height: boardHeight }}
        >
          <div
            className="absolute left-6 top-6"
            style={{ width: canvasSize.width, height: canvasSize.height }}
          >
            <div className="absolute inset-0 z-0 overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full w-full"
                style={{
                  ...canvasSurfaceStyle,
                  backgroundImage: 'conic-gradient(#ccc 25%, #fff 25%, #fff 50%, #ccc 50%, #ccc 75%, #fff 75%, #fff 100%)',
                  backgroundSize: '20px 20px',
                  opacity: 0.5,
                }}
              ></div>
              <div
                className="absolute left-0 top-0 h-full w-full pointer-events-none border border-gray-700"
                style={canvasSurfaceStyle}
              ></div>
            </div>
            {editingTextLayerId && textEditorStyle && (
              <textarea
                ref={textareaRef}
                rows={1}
                value={textEditorDraft}
                onChange={(event) => onTextEditorDraftChange(event.target.value)}
                onBlur={() => finishTextEditing(true)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    finishTextEditing(false);
                  }

                  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault();
                    finishTextEditing(true);
                  }
                }}
                style={textEditorStyle}
                className="absolute"
              />
            )}
          </div>
        </div>

        <Stage
          width={workspaceWidth}
          height={workspaceHeight}
          ref={stageRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
          onMouseMove={handleMouseMove}
          onTouchMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchEnd={handleMouseUp}
          onWheel={handleWheel}
          className="absolute left-0 top-0 z-10"
          style={{ cursor: editingTextLayerId === null && spacePressed ? 'grab' : 'default' }}
        >
          <Layer>
            <Group
              id="canvas-content-root"
              x={canvasOrigin.x + viewTransform.position.x}
              y={canvasOrigin.y + viewTransform.position.y}
              scaleX={viewTransform.scale}
              scaleY={viewTransform.scale}
            >
              {!isTransparent && (
                <Rect
                  id="canvas-background"
                  x={0}
                  y={0}
                  width={canvasSize.width}
                  height={canvasSize.height}
                  fill={bgColor}
                  listening={false}
                />
              )}

              {layers.map((layer) => renderLayerNode(layer))}

              {snapGuides.vertical !== null && (
                <Line
                  points={[snapGuides.vertical, 0, snapGuides.vertical, canvasSize.height]}
                  stroke="#60a5fa"
                  strokeWidth={1}
                  dash={[6, 4]}
                  listening={false}
                />
              )}

              {snapGuides.horizontal !== null && (
                <Line
                  points={[0, snapGuides.horizontal, canvasSize.width, snapGuides.horizontal]}
                  stroke="#60a5fa"
                  strokeWidth={1}
                  dash={[6, 4]}
                  listening={false}
                />
              )}

              {draftStroke && (
                <Line
                  points={draftStroke.points}
                  stroke={draftStroke.stroke}
                  strokeWidth={draftStroke.strokeWidth}
                  tension={draftStroke.tension}
                  lineCap={draftStroke.lineCap}
                  lineJoin={draftStroke.lineJoin}
                  listening={false}
                />
              )}

              {marqueeSelection && (
                <Rect
                  x={Math.min(marqueeSelection.start.x, marqueeSelection.current.x)}
                  y={Math.min(marqueeSelection.start.y, marqueeSelection.current.y)}
                  width={Math.abs(marqueeSelection.current.x - marqueeSelection.start.x)}
                  height={Math.abs(marqueeSelection.current.y - marqueeSelection.start.y)}
                  fill="rgba(96, 165, 250, 0.12)"
                  stroke="#60a5fa"
                  strokeWidth={1}
                  dash={[6, 4]}
                  listening={false}
                />
              )}
              <Transformer
                ref={transformerRef}
                onTransformEnd={onSelectionTransformEnd}
                boundBoxFunc={(oldBox, newBox) => {
                  if (newBox.width < 5 || newBox.height < 5) {
                    return oldBox;
                  }
                  return newBox;
                }}
                anchorSize={8}
                anchorCornerRadius={4}
                borderStroke="#3b82f6"
                anchorStroke="#3b82f6"
                anchorFill="#ffffff"
              />
            </Group>
          </Layer>
        </Stage>
      </div>
    </div>
  );
};

export default EditorCanvas;
