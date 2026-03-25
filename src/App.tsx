import React, { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { Download, FolderOpen, Keyboard, Redo, RotateCcw, Save, Undo, ZoomIn, ZoomOut } from 'lucide-react';
import Konva from 'konva';
import EditorCanvas from './components/EditorCanvas';
import EditorSidebar from './components/EditorSidebar';
import EditorToolbar from './components/EditorToolbar';
import {
  appendPointToStroke,
  createCircleLayer,
  createDrawingLayer,
  createDrawingStroke,
  createGroupLayer,
  createImageLayer,
  createRectLayer,
  createStraightLineLayer,
  createTextLayer,
  duplicateLayer,
  alignLayerToCanvas,
  alignLayersToSelection,
  distributeLayersInSelection,
  findLayerByIdDeep,
  moveLayer,
  removeLayerByIdDeep,
  reorderLayer,
  ungroupLayer,
  updateStraightLineEndpoint,
  updateLayerById,
  updateLayerByIdDeep,
} from './lib/editorUtils';
import { deserializeProject, isSerializedProject, serializeLayers, serializeProject } from './lib/projectFormat';
import type { ActivePanel, CanvasSize, DrawingStroke, LayerItem, LineLayer, Point, ToolType, ViewTransform } from './types';

const AUTOSAVE_KEY = 'editnow-autosave-v1';

const App: React.FC = () => {
  const [history, setHistory] = useState<LayerItem[][]>([[]]);
  const [historyLabels, setHistoryLabels] = useState<string[]>(['Start']);
  const [historyStep, setHistoryStep] = useState(0);
  const [layers, setLayers] = useState<LayerItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedNestedLayerId, setSelectedNestedLayerId] = useState<string | null>(null);
  const [tool, setTool] = useState<ToolType>('select');
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ width: 800, height: 600 });
  const [bgColor, setBgColor] = useState('#ffffff');
  const [isTransparent, setIsTransparent] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [draftLine, setDraftLine] = useState<LineLayer | null>(null);
  const [draftStroke, setDraftStroke] = useState<DrawingStroke | null>(null);
  const [drawingColor, setDrawingColor] = useState('#000000');
  const [drawingSize, setDrawingSize] = useState(5);
  const [activePanel, setActivePanel] = useState<ActivePanel>('layers');
  const [editingTextLayerId, setEditingTextLayerId] = useState<string | null>(null);
  const [textEditorDraft, setTextEditorDraft] = useState('');
  const [viewTransform, setViewTransform] = useState<ViewTransform>({
    scale: 1,
    position: { x: 0, y: 0 },
  });
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg'>('png');
  const [exportScale, setExportScale] = useState(2);
  const [exportBackgroundMode, setExportBackgroundMode] = useState<'current' | 'transparent' | 'solid'>('current');
  const [exportBackgroundColor, setExportBackgroundColor] = useState('#ffffff');
  const [exportFileName, setExportFileName] = useState('editnow-export');
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);

  const stageRef = useRef<Konva.Stage | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef(history);
  const historyLabelsRef = useRef(historyLabels);
  const historyStepRef = useRef(historyStep);
  const layersRef = useRef(layers);
  const clipboardRef = useRef<LayerItem[]>([]);
  const pasteCountRef = useRef(0);
  const propertyCommitTimeoutRef = useRef<number | null>(null);
  const hasPendingPropertyCommitRef = useRef(false);

  const visibleLayers = useMemo(() => (draftLine ? [...layers, draftLine] : layers), [draftLine, layers]);
  const selectedId = selectedIds.at(-1) ?? null;
  const selectedTopLevelLayer = useMemo(
    () => layers.find((layer) => layer.id === selectedId) ?? null,
    [layers, selectedId],
  );
  const selectedLayer = useMemo(
    () => (selectedNestedLayerId ? findLayerByIdDeep(layers, selectedNestedLayerId) : selectedTopLevelLayer),
    [layers, selectedNestedLayerId, selectedTopLevelLayer],
  );
  const activeEditingTextLayerId = useMemo(
    () => (editingTextLayerId && layers.some((layer) => layer.id === editingTextLayerId && layer.type === 'text') ? editingTextLayerId : null),
    [editingTextLayerId, layers],
  );
  const selectedLayerSummary = useMemo(() => {
    if (selectedIds.length > 1) {
      return {
        name: `${selectedIds.length} layers`,
        type: 'MULTI',
        detail: 'Bulk actions enabled',
      };
    }

    if (!selectedLayer) {
      return null;
    }

    return {
      name: selectedLayer.name,
      type: selectedLayer.type.toUpperCase(),
      detail:
        selectedLayer.type === 'drawing'
          ? `${selectedLayer.strokes.length} stroke${selectedLayer.strokes.length === 1 ? '' : 's'}`
          : selectedLayer.type === 'text'
            ? `${selectedLayer.text.trim().length || 1} chars`
            : selectedLayer.type === 'image'
              ? `${Math.round(selectedLayer.width)} x ${Math.round(selectedLayer.height)}`
              : selectedLayer.type === 'group'
                ? `${selectedLayer.children.length} items`
              : selectedLayer.type === 'circle'
                ? `R ${Math.round(selectedLayer.radius)}`
                : selectedLayer.type === 'rect'
                  ? `${Math.round(selectedLayer.width)} x ${Math.round(selectedLayer.height)}`
                  : `${Math.max(1, Math.floor(selectedLayer.points.length / 2))} pts`,
      context: selectedNestedLayerId ? 'Inside group' : null,
    };
  }, [selectedIds.length, selectedLayer, selectedNestedLayerId]);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    historyLabelsRef.current = historyLabels;
  }, [historyLabels]);

  useEffect(() => {
    historyStepRef.current = historyStep;
  }, [historyStep]);

  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  useEffect(() => {
    const restoreAutosave = async () => {
      const raw = window.localStorage.getItem(AUTOSAVE_KEY);
      if (!raw) {
        return;
      }

      try {
        const parsed: unknown = JSON.parse(raw);
        if (!isSerializedProject(parsed)) {
          return;
        }

        const project = await deserializeProject(parsed);
        setCanvasSize(project.canvasSize);
        setBgColor(project.bgColor);
        setIsTransparent(project.isTransparent);
        setSelectedIds([]);
        setSelectedNestedLayerId(null);
        setTool('select');
        setActivePanel('layers');
        setEditingTextLayerId(null);
        setTextEditorDraft('');
        setDraftLine(null);
        setDraftStroke(null);
        setViewTransform({ scale: 1, position: { x: 0, y: 0 } });
        setHistory([project.layers]);
        historyRef.current = [project.layers];
        setHistoryLabels(['Recovered autosave']);
        historyLabelsRef.current = ['Recovered autosave'];
        setHistoryStep(0);
        historyStepRef.current = 0;
        replaceVisibleLayers(project.layers);
      } catch (error) {
        console.error(error);
      }
    };

    void restoreAutosave();
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const project = serializeProject({
          canvasSize,
          bgColor,
          isTransparent,
          layers: serializeLayers(layers),
        });
        window.localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(project));
      } catch (error) {
        console.error(error);
      }
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [bgColor, canvasSize, isTransparent, layers]);

  const clearPendingPropertyCommit = () => {
    if (propertyCommitTimeoutRef.current !== null) {
      window.clearTimeout(propertyCommitTimeoutRef.current);
      propertyCommitTimeoutRef.current = null;
    }
    hasPendingPropertyCommitRef.current = false;
  };

  const replaceVisibleLayers = (nextLayers: LayerItem[]) => {
    layersRef.current = nextLayers;
    setLayers(nextLayers);
  };

  const commitLayers = (nextLayers: LayerItem[], label = 'Edit') => {
    clearPendingPropertyCommit();
    const nextHistory = historyRef.current.slice(0, historyStepRef.current + 1);
    const nextLabels = historyLabelsRef.current.slice(0, historyStepRef.current + 1);
    nextHistory.push(nextLayers);
    nextLabels.push(label);
    historyRef.current = nextHistory;
    historyLabelsRef.current = nextLabels;
    historyStepRef.current = nextHistory.length - 1;
    layersRef.current = nextLayers;
    setHistory(nextHistory);
    setHistoryLabels(nextLabels);
    setHistoryStep(nextHistory.length - 1);
    setLayers(nextLayers);
  };

  const handleUndo = () => {
    setEditingTextLayerId(null);
    setTextEditorDraft('');
    if (hasPendingPropertyCommitRef.current) {
      clearPendingPropertyCommit();
      const currentSnapshot = historyRef.current[historyStepRef.current] ?? [];
      replaceVisibleLayers(currentSnapshot);
      return;
    }

    if (historyStep === 0) {
      return;
    }

    const nextStep = historyStep - 1;
    const nextLayers = history[nextStep] ?? [];
    setSelectedIds([]);
    setSelectedNestedLayerId(null);
    historyStepRef.current = nextStep;
    setHistoryStep(nextStep);
    replaceVisibleLayers(nextLayers);
    setDraftLine(null);
    setDraftStroke(null);
    setIsDrawing(false);
  };

  const handleRedo = () => {
    setEditingTextLayerId(null);
    setTextEditorDraft('');
    if (hasPendingPropertyCommitRef.current) {
      clearPendingPropertyCommit();
      return;
    }

    if (historyStep >= history.length - 1) {
      return;
    }

    const nextStep = historyStep + 1;
    const nextLayers = history[nextStep] ?? [];
    setSelectedIds([]);
    setSelectedNestedLayerId(null);
    historyStepRef.current = nextStep;
    setHistoryStep(nextStep);
    replaceVisibleLayers(nextLayers);
    setDraftLine(null);
    setDraftStroke(null);
    setIsDrawing(false);
  };

  const handleDelete = () => {
    if (selectedNestedLayerId) {
      commitLayers(removeLayerByIdDeep(layersRef.current, selectedNestedLayerId), 'Delete layer');
      setSelectedNestedLayerId(null);
      return;
    }

    if (selectedIds.length === 0) {
      return;
    }

    const deletableIds = new Set(
      layers
        .filter((layer) => selectedIds.includes(layer.id) && !layer.locked)
        .map((layer) => layer.id),
    );

    if (deletableIds.size === 0) {
      return;
    }

    commitLayers(layers.filter((layer) => !deletableIds.has(layer.id)), 'Delete layer');
    setSelectedIds(selectedIds.filter((id) => !deletableIds.has(id)));
    setSelectedNestedLayerId(null);
    if (editingTextLayerId && deletableIds.has(editingTextLayerId)) {
      setEditingTextLayerId(null);
      setTextEditorDraft('');
    }
  };

  const nudgeSelectedLayer = (dx: number, dy: number) => {
    if (selectedNestedLayerId) {
      commitLayers(
        updateLayerByIdDeep(layersRef.current, selectedNestedLayerId, (layer) => (
          layer.locked
            ? layer
            : {
                ...layer,
                x: layer.x + dx,
                y: layer.y + dy,
              }
        )),
        'Move layer',
      );
      return;
    }

    if (selectedIds.length === 0) {
      return;
    }

    commitLayers(
      layersRef.current.map((layer) => (
        selectedIds.includes(layer.id) && !layer.locked
          ? {
              ...layer,
              x: layer.x + dx,
              y: layer.y + dy,
            }
          : layer
      )),
      'Move selection',
    );
  };

  const copySelectedLayers = () => {
    const orderedSelection = layersRef.current.filter((layer) => selectedIds.includes(layer.id));
    clipboardRef.current = orderedSelection.map((layer) => duplicateLayer({
      ...layer,
      id: layer.id,
      x: layer.x - 24,
      y: layer.y - 24,
      name: layer.name.replace(/ Copy$/, ''),
    }));
    pasteCountRef.current = 0;
  };

  const pasteClipboardLayers = () => {
    if (clipboardRef.current.length === 0) {
      return;
    }

    pasteCountRef.current += 1;
    const offset = 24 * pasteCountRef.current;
    const pastedLayers = clipboardRef.current.map((layer) => {
      const duplicated = duplicateLayer({
        ...layer,
        x: layer.x + offset - 24,
        y: layer.y + offset - 24,
        name: layer.name.replace(/ Copy$/, ''),
      });

      return {
        ...duplicated,
        name: duplicated.name.replace(/ Copy$/, ''),
      };
    });

    commitLayers([...layersRef.current, ...pastedLayers], 'Paste');
    setSelectedIds(pastedLayers.map((layer) => layer.id));
    setTool('select');
    setActivePanel('properties');
  };

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const activeTag = document.activeElement?.tagName;
    const isEditableTarget =
      activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT';

    if (!isEditableTarget && event.key === '?') {
      event.preventDefault();
      setShowShortcutHelp((current) => !current);
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key === 'z') {
      event.preventDefault();
      if (event.shiftKey) {
        handleRedo();
      } else {
        handleUndo();
      }
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key === 'y') {
      event.preventDefault();
      handleRedo();
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'd') {
      if (!isEditableTarget && selectedIds.length > 0) {
        event.preventDefault();
        const nextLayers = [...layersRef.current];
        const duplicatedIds: string[] = [];

        for (const id of selectedIds) {
          const sourceLayer = nextLayers.find((layer) => layer.id === id);
          if (!sourceLayer) {
            continue;
          }

          const nextLayer = duplicateLayer(sourceLayer);
          const sourceIndex = nextLayers.findIndex((layer) => layer.id === id);
          nextLayers.splice(sourceIndex + 1, 0, nextLayer);
          duplicatedIds.push(nextLayer.id);
        }

        if (duplicatedIds.length > 0) {
          commitLayers(nextLayers, 'Duplicate selection');
          setSelectedIds(duplicatedIds);
          setSelectedNestedLayerId(null);
          setTool('select');
          setActivePanel('properties');
        }
      }
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'c') {
      if (!isEditableTarget && selectedIds.length > 0) {
        event.preventDefault();
        copySelectedLayers();
      }
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'v') {
      if (!isEditableTarget) {
        event.preventDefault();
        pasteClipboardLayers();
      }
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a') {
      if (!isEditableTarget) {
        event.preventDefault();
        setSelectedIds(layersRef.current.filter((layer) => layer.visible).map((layer) => layer.id));
        setSelectedNestedLayerId(null);
        setTool('select');
        setActivePanel('properties');
      }
      return;
    }

    if (!isEditableTarget && !event.metaKey && !event.ctrlKey && !event.altKey) {
      const key = event.key.toLowerCase();

      if (key === '0') {
        event.preventDefault();
        fitCanvasToViewport();
        return;
      }

      if (key === '1') {
        event.preventDefault();
        resetViewTransform();
        return;
      }

      if (key === 'v') {
        event.preventDefault();
        selectTool('select');
        return;
      }

      if (key === 'b') {
        event.preventDefault();
        selectTool('brush');
        return;
      }

      if (key === 'l') {
        event.preventDefault();
        selectTool('line');
        return;
      }

      if (key === 't') {
        event.preventDefault();
        handleAddText();
        return;
      }

      if (key === 'r') {
        event.preventDefault();
        handleAddRect();
        return;
      }

      if (key === 'o') {
        event.preventDefault();
        handleAddCircle();
        return;
      }

      if (key === 'n') {
        event.preventDefault();
        handleAddDrawingLayer();
        return;
      }

      if (key === 'i') {
        event.preventDefault();
        fileInputRef.current?.click();
        return;
      }
    }

    if (!isEditableTarget && selectedIds.length > 0 && tool === 'select') {
      const step = event.shiftKey ? 10 : 1;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        nudgeSelectedLayer(-step, 0);
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        nudgeSelectedLayer(step, 0);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        nudgeSelectedLayer(0, -step);
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        nudgeSelectedLayer(0, step);
        return;
      }
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (!isEditableTarget) {
        handleDelete();
      }
      return;
    }

    if (event.key === 'Escape') {
      setSelectedIds([]);
      setSelectedNestedLayerId(null);
      setEditingTextLayerId(null);
      setTextEditorDraft('');
      setShowShortcutHelp(false);
    }
  });

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => () => clearPendingPropertyCommit(), []);

  useEffect(() => {
    const transformer = transformerRef.current;
    const stage = stageRef.current;
    if (!transformer || !stage) {
      return;
    }

    if (
      selectedIds.length !== 1 ||
      tool !== 'select' ||
      activeEditingTextLayerId !== null ||
      !selectedLayer?.visible ||
      selectedLayer.locked ||
      selectedLayer.type === 'drawing' ||
      selectedLayer.type === 'group'
    ) {
      transformer.nodes([]);
      transformer.getLayer()?.batchDraw();
      return;
    }

    const node = selectedId ? stage.findOne(`#${selectedId}`) : null;
    transformer.nodes(node ? [node] : []);
    transformer.getLayer()?.batchDraw();
  }, [activeEditingTextLayerId, layers, selectedId, selectedIds.length, selectedLayer, tool]);

  const selectTool = (nextTool: ToolType) => {
    setTool(nextTool);
    const keepDrawingSelection =
      nextTool === 'brush' &&
      selectedIds.length === 1 &&
      selectedLayer?.type === 'drawing' &&
      selectedLayer.visible &&
      !selectedLayer.locked;

    if (nextTool !== 'select' && !keepDrawingSelection) {
      setSelectedIds([]);
      setSelectedNestedLayerId(null);
      setEditingTextLayerId(null);
      setTextEditorDraft('');
    }
  };

  const selectLayer = (layerId: string, additive = false) => {
    setSelectedNestedLayerId(null);
    setSelectedIds((current) => {
      if (!additive) {
        return [layerId];
      }

      return current.includes(layerId)
        ? current.filter((id) => id !== layerId)
        : [...current, layerId];
    });
    setTool('select');
    setActivePanel('properties');
  };

  const selectLayers = (layerIds: string[], additive = false) => {
    setSelectedNestedLayerId(null);
    setSelectedIds((current) => {
      if (!additive) {
        return layerIds;
      }

      return [...new Set([...current, ...layerIds])];
    });

    if (layerIds.length === 0 && !additive) {
      setEditingTextLayerId(null);
      setTextEditorDraft('');
    }

    setTool('select');
    setActivePanel('properties');
  };

  const selectNestedLayer = (groupId: string, layerId: string) => {
    if (!groupId) {
      return;
    }

    setSelectedIds([groupId]);
    setSelectedNestedLayerId(layerId);
    setTool('select');
    setActivePanel('properties');
  };

  const startTextEditing = (layerId: string) => {
    const textLayer = layersRef.current.find(
      (layer): layer is LayerItem & { type: 'text' } => layer.id === layerId && layer.type === 'text',
    );
    if (!textLayer || textLayer.type !== 'text') {
      return;
    }

    setSelectedIds([layerId]);
    setSelectedNestedLayerId(null);
    setTool('select');
    setActivePanel('properties');
    setEditingTextLayerId(layerId);
    setTextEditorDraft(textLayer.text);
  };

  const cancelTextEditing = () => {
    setEditingTextLayerId(null);
    setTextEditorDraft('');
  };

  const commitTextEditing = (layerId: string, text: string) => {
    commitLayers(
      updateLayerById(layersRef.current, layerId, (layer) =>
        layer.type === 'text'
          ? {
              ...layer,
              text,
            }
          : layer,
      ),
    );
    setEditingTextLayerId(null);
    setTextEditorDraft('');
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new window.FileReader();
    const image = new window.Image();

    reader.onload = () => {
      const src = typeof reader.result === 'string' ? reader.result : null;
      if (!src) {
        return;
      }

      image.onload = () => {
        const nextLayer = createImageLayer(file.name, image, canvasSize, src);
        commitLayers([...layers, nextLayer], 'Add image');
        setSelectedIds([nextLayer.id]);
        setSelectedNestedLayerId(null);
        setTool('select');
        setActivePanel('properties');
      };

      image.src = src;
    };

    image.onerror = () => {
      window.alert('Failed to load image file.');
    };

    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleAddText = () => {
      const nextLayer = createTextLayer(canvasSize);
      commitLayers([...layers, nextLayer], 'Add text');
      setSelectedIds([nextLayer.id]);
      setSelectedNestedLayerId(null);
      setTool('select');
      setActivePanel('properties');
      setEditingTextLayerId(nextLayer.id);
      setTextEditorDraft(nextLayer.text);
  };

  const handleAddRect = () => {
    const nextLayer = createRectLayer(canvasSize);
    commitLayers([...layers, nextLayer], 'Add rectangle');
    setSelectedIds([nextLayer.id]);
    setSelectedNestedLayerId(null);
    setTool('select');
    setActivePanel('properties');
  };

  const handleAddCircle = () => {
    const nextLayer = createCircleLayer(canvasSize);
    commitLayers([...layers, nextLayer], 'Add circle');
    setSelectedIds([nextLayer.id]);
    setSelectedNestedLayerId(null);
    setTool('select');
    setActivePanel('properties');
  };

  const handleAddDrawingLayer = () => {
    const nextLayer = createDrawingLayer();
    commitLayers([...layers, nextLayer], 'Add drawing layer');
    setSelectedIds([nextLayer.id]);
    setSelectedNestedLayerId(null);
    setTool('brush');
    setActivePanel('properties');
  };

  const handleExport = () => {
    const stage = stageRef.current;
    const transformer = transformerRef.current;
    if (!stage) {
      return;
    }

    const canvasRoot = stage.findOne('#canvas-content-root') as Konva.Group | null;
    const backgroundNode = stage.findOne('#canvas-background') as Konva.Rect | null;
    const previousBackgroundVisible = backgroundNode?.visible() ?? false;
    const previousBackgroundFill = backgroundNode?.fill() ?? bgColor;
    const previousCanvasRootTransform = canvasRoot
      ? {
          x: canvasRoot.x(),
          y: canvasRoot.y(),
          scaleX: canvasRoot.scaleX(),
          scaleY: canvasRoot.scaleY(),
        }
      : null;

    transformer?.nodes([]);
    if (canvasRoot) {
      canvasRoot.position({ x: 0, y: 0 });
      canvasRoot.scale({ x: 1, y: 1 });
    }

    if (backgroundNode) {
      if (exportBackgroundMode === 'transparent') {
        backgroundNode.visible(false);
      } else if (exportBackgroundMode === 'solid') {
        backgroundNode.visible(true);
        backgroundNode.fill(exportBackgroundColor);
      } else {
        backgroundNode.visible(!isTransparent);
        backgroundNode.fill(bgColor);
      }
    }

    stage.batchDraw();

    const uri = stage.toDataURL({
      x: 0,
      y: 0,
      width: canvasSize.width,
      height: canvasSize.height,
      pixelRatio: exportScale,
      mimeType: exportFormat === 'jpeg' ? 'image/jpeg' : 'image/png',
      quality: exportFormat === 'jpeg' ? 0.92 : undefined,
    });

    if (canvasRoot && previousCanvasRootTransform) {
      canvasRoot.position({
        x: previousCanvasRootTransform.x,
        y: previousCanvasRootTransform.y,
      });
      canvasRoot.scale({
        x: previousCanvasRootTransform.scaleX,
        y: previousCanvasRootTransform.scaleY,
      });
    }
    if (backgroundNode) {
      backgroundNode.visible(previousBackgroundVisible);
      backgroundNode.fill(previousBackgroundFill);
    }
    stage.batchDraw();

    const link = document.createElement('a');
    link.download = `${(exportFileName || 'editnow-export').trim() || 'editnow-export'}.${exportFormat === 'jpeg' ? 'jpg' : 'png'}`;
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (selectedIds.length === 1 && selectedId) {
      const node = stage.findOne(`#${selectedId}`);
      transformer?.nodes(node ? [node] : []);
    }
  };

  const handleProjectExport = () => {
    const project = serializeProject({
      canvasSize,
      bgColor,
      isTransparent,
      layers: serializeLayers(layersRef.current),
    });

    const blob = new Blob([JSON.stringify(project, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.download = 'editnow-project.json';
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleProjectImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const raw = await file.text();
      const parsed: unknown = JSON.parse(raw);
      if (!isSerializedProject(parsed)) {
        throw new Error('Unsupported project format.');
      }

      const project = await deserializeProject(parsed);
      clearPendingPropertyCommit();
      setCanvasSize(project.canvasSize);
      setBgColor(project.bgColor);
      setIsTransparent(project.isTransparent);
      setSelectedIds([]);
      setSelectedNestedLayerId(null);
      setTool('select');
      setActivePanel('layers');
      setEditingTextLayerId(null);
      setTextEditorDraft('');
      setDraftLine(null);
      setDraftStroke(null);
      setViewTransform({ scale: 1, position: { x: 0, y: 0 } });
      setHistory([project.layers]);
      historyRef.current = [project.layers];
      setHistoryLabels(['Opened project']);
      historyLabelsRef.current = ['Opened project'];
      setHistoryStep(0);
      historyStepRef.current = 0;
      replaceVisibleLayers(project.layers);
      window.localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(parsed));
    } catch (error) {
      console.error(error);
      window.alert('Failed to open project file.');
    } finally {
      event.target.value = '';
    }
  };

  const handleSelectHistoryStep = (step: number) => {
    const nextLayers = historyRef.current[step];
    if (!nextLayers) {
      return;
    }

    clearPendingPropertyCommit();
    setSelectedIds([]);
    setSelectedNestedLayerId(null);
    setEditingTextLayerId(null);
    setTextEditorDraft('');
    setDraftLine(null);
    setDraftStroke(null);
    historyStepRef.current = step;
    setHistoryStep(step);
    replaceVisibleLayers(nextLayers);
    setActivePanel('history');
  };

  const adjustZoom = (direction: 'in' | 'out') => {
    setViewTransform((current) => ({
      scale: direction === 'in'
        ? Math.min(current.scale * 1.1, 4)
        : Math.max(current.scale / 1.1, 0.25),
      position: current.position,
    }));
  };

  const fitCanvasToViewport = () => {
    // Dynamically calculate available space based on the workspace container
    const workspaceElement = document.querySelector('.flex-1.min-h-0.overflow-hidden.bg-gray-900\\/50');
    if (!workspaceElement) return;

    const { clientWidth, clientHeight } = workspaceElement;
    
    // Add some padding
    const padding = 40;
    const availableWidth = Math.max(clientWidth - padding * 2, 320);
    const availableHeight = Math.max(clientHeight - padding * 2, 240);

    const scale = Math.min(
      4, // Max scale cap
      Math.min(availableWidth / canvasSize.width, availableHeight / canvasSize.height)
    );

    // Ensure a minimum reasonable scale so it doesn't disappear
    const finalScale = Math.max(0.1, scale);

    // EditorCanvas centers the "board" (ruler + canvas) internally.
    // To perfectly center the scaled canvas, we need to offset the position
    // to account for the scale and the ruler's presence.
    // RULER_SIZE is 24px.
    setViewTransform({
      scale: finalScale,
      position: {
        x: Math.round((canvasSize.width - canvasSize.width * finalScale) / 2 - 12),
        y: Math.round((canvasSize.height - canvasSize.height * finalScale) / 2 - 12),
      },
    });
  };

  const resetViewTransform = () => {
    setViewTransform({
      scale: 1,
      position: { x: -12, y: -12 },
    });
  };

  const handlePointerDown = (position: Point | null, clickedOnEmpty: boolean) => {
    if (tool === 'select') {
      if (clickedOnEmpty) {
        setSelectedIds([]);
        setEditingTextLayerId(null);
        setTextEditorDraft('');
      }
      return;
    }

    if ((tool !== 'brush' && tool !== 'line') || !position) {
      return;
    }

    setIsDrawing(true);
    if (tool === 'brush') {
      setDraftStroke(createDrawingStroke(position, drawingColor, drawingSize));
      return;
    }

    setDraftLine(createStraightLineLayer(position, drawingColor, drawingSize));
  };

  const handlePointerMove = (position: Point | null) => {
    if (!isDrawing || !position) {
      return;
    }

    if (tool === 'brush') {
      setDraftStroke((currentStroke) => {
        if (!currentStroke) {
          return currentStroke;
        }

        return appendPointToStroke(currentStroke, position);
      });
      return;
    }

    setDraftLine((currentLine) => {
      if (!currentLine) {
        return currentLine;
      }

      if (tool === 'line') {
        return updateStraightLineEndpoint(currentLine, position);
      }

      return currentLine;
    });
  };

  const handlePointerUp = () => {
    if (!isDrawing) {
      return;
    }

    if (tool === 'brush' && draftStroke) {
      const activeDrawingLayer = layersRef.current.find(
        (layer) => layer.id === selectedId && layer.type === 'drawing' && layer.visible && !layer.locked,
      );

      if (activeDrawingLayer?.type === 'drawing') {
        commitLayers(
          updateLayerById(layersRef.current, activeDrawingLayer.id, (layer) =>
            layer.type === 'drawing'
              ? {
                  ...layer,
                  strokes: [...layer.strokes, draftStroke],
                }
              : layer,
          ),
          'Brush stroke',
        );
      } else {
        const nextLayer = createDrawingLayer();
        nextLayer.strokes = [draftStroke];
        commitLayers([...layersRef.current, nextLayer], 'Brush stroke');
        setSelectedIds([nextLayer.id]);
        setActivePanel('properties');
      }
    }

    if (tool === 'line' && draftLine) {
      commitLayers([...layersRef.current, draftLine], 'Draw line');
    }

    setDraftLine(null);
    setDraftStroke(null);
    setIsDrawing(false);
  };

  const handleLayerUpdate = (updatedLayer: LayerItem) => {
    const nextLayers = selectedNestedLayerId
      ? updateLayerByIdDeep(layersRef.current, updatedLayer.id, () => updatedLayer)
      : updateLayerById(layersRef.current, updatedLayer.id, () => updatedLayer);
    replaceVisibleLayers(nextLayers);
    hasPendingPropertyCommitRef.current = true;

    if (propertyCommitTimeoutRef.current !== null) {
      window.clearTimeout(propertyCommitTimeoutRef.current);
    }

    propertyCommitTimeoutRef.current = window.setTimeout(() => {
      commitLayers(layersRef.current, 'Update properties');
    }, 250);
  };

  const handleAlignLayer = (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (selectedNestedLayerId) {
      return;
    }

    if (selectedIds.length === 0) {
      return;
    }

    commitLayers(
      layersRef.current.map((layer) => {
        if (!selectedIds.includes(layer.id) || layer.locked) {
          return layer;
        }

        return {
          ...layer,
          ...alignLayerToCanvas(layer, canvasSize, alignment),
        };
      }),
      'Align to canvas',
    );
  };

  const handleAlignSelection = (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (selectedIds.length < 2) {
      return;
    }

    commitLayers(alignLayersToSelection(layersRef.current, selectedIds, alignment), 'Align selection');
  };

  const handleDistributeSelection = (axis: 'horizontal' | 'vertical') => {
    if (selectedIds.length < 3) {
      return;
    }

    commitLayers(distributeLayersInSelection(layersRef.current, selectedIds, axis), 'Distribute selection');
  };

  const handleBulkVisibility = (visible: boolean) => {
    if (selectedIds.length === 0) {
      return;
    }

    commitLayers(
      layersRef.current.map((layer) => (
        selectedIds.includes(layer.id)
          ? {
              ...layer,
              visible,
            }
          : layer
      )),
      'Toggle visibility',
    );
  };

  const handleBulkLock = (locked: boolean) => {
    if (selectedIds.length === 0) {
      return;
    }

    commitLayers(
      layersRef.current.map((layer) => (
        selectedIds.includes(layer.id)
          ? {
              ...layer,
              locked,
            }
          : layer
      )),
      'Toggle lock',
    );
  };

  const handleGroupSelection = () => {
    setSelectedNestedLayerId(null);
    const selectedLayers = layersRef.current.filter((layer) => selectedIds.includes(layer.id));
    if (selectedLayers.length < 2) {
      return;
    }

    const group = createGroupLayer(selectedLayers);
    const nextLayers = layersRef.current.filter((layer) => !selectedIds.includes(layer.id));
    nextLayers.push(group);
    commitLayers(nextLayers, 'Group layers');
    setSelectedIds([group.id]);
    setActivePanel('properties');
  };

  const handleUngroupSelection = () => {
    const activeGroup = selectedTopLevelLayer?.type === 'group' ? selectedTopLevelLayer : null;
    if (!activeGroup) {
      return;
    }

    const nextLayers = layersRef.current.flatMap((layer) => {
      if (layer.id !== activeGroup.id) {
        return [layer];
      }

      return ungroupLayer(activeGroup);
    });

    commitLayers(nextLayers, 'Ungroup');
    setSelectedIds(nextLayers.slice(-activeGroup.children.length).map((layer) => layer.id));
    setSelectedNestedLayerId(null);
    setActivePanel('properties');
  };

  const handleLayerDragEnd = (layerId: string, position: Point) => {
    const draggedLayer = layers.find((layer) => layer.id === layerId);
    if (!draggedLayer) {
      return;
    }

    const dx = position.x - draggedLayer.x;
    const dy = position.y - draggedLayer.y;
    const shouldMoveGroup = selectedIds.includes(layerId) && selectedIds.length > 1;

    if (!shouldMoveGroup) {
      commitLayers(
        updateLayerById(layers, layerId, (layer) => ({
          ...layer,
          x: position.x,
          y: position.y,
        })),
        'Move layer',
      );
      return;
    }

    commitLayers(
      layers.map((layer) => (
        selectedIds.includes(layer.id) && !layer.locked
          ? {
              ...layer,
              x: layer.x + dx,
              y: layer.y + dy,
            }
          : layer
      )),
      'Move selection',
    );
  };

  const handleLayerTransformEnd = (layerId: string, node: Konva.Node) => {
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    node.scaleX(1);
    node.scaleY(1);

    commitLayers(
      updateLayerById(layers, layerId, (layer) => {
        const nextLayer: LayerItem = {
          ...layer,
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
        };
        const absScaleX = Math.abs(scaleX);
        const absScaleY = Math.abs(scaleY);

        if (layer.type === 'rect' || layer.type === 'image') {
          const resizedLayer = {
            ...nextLayer,
            width: Math.max(5, node.width() * absScaleX),
            height: Math.max(5, node.height() * absScaleY),
          };

          if (layer.type === 'image') {
            return {
              ...resizedLayer,
              flipX: scaleX < 0 ? !layer.flipX : layer.flipX,
              flipY: scaleY < 0 ? !layer.flipY : layer.flipY,
            };
          }

          return resizedLayer;
        }

        if (layer.type === 'circle') {
          return {
            ...nextLayer,
            radius: Math.max(5, (node.width() * absScaleX) / 2),
          };
        }

        if (layer.type === 'text') {
          return {
            ...nextLayer,
            fontSize: Math.max(5, layer.fontSize * absScaleY),
          };
        }

        return nextLayer;
      }),
      'Transform layer',
    );
  };

  const handleMoveLayer = (layerId: string, direction: 'up' | 'down') => {
    commitLayers(moveLayer(layers, layerId, direction), 'Reorder layer');
  };

  const handleReorderLayer = (layerId: string, position: 'front' | 'back') => {
    commitLayers(reorderLayer(layers, layerId, position), 'Reorder layer');
  };

  const handleDuplicateLayer = (layerId: string) => {
    const sourceLayer = layersRef.current.find((layer) => layer.id === layerId);
    if (!sourceLayer) {
      return;
    }

    const nextLayer = duplicateLayer(sourceLayer);
    const sourceIndex = layersRef.current.findIndex((layer) => layer.id === layerId);
    const nextLayers = [...layersRef.current];
    nextLayers.splice(sourceIndex + 1, 0, nextLayer);
    commitLayers(nextLayers, 'Duplicate layer');
    setSelectedIds([nextLayer.id]);
    setTool('select');
    setActivePanel('properties');
  };

  const handleToggleLayerVisibility = (layerId: string) => {
    commitLayers(
      updateLayerById(layersRef.current, layerId, (layer) => ({
        ...layer,
        visible: !layer.visible,
      })),
      'Toggle visibility',
    );

    if (editingTextLayerId === layerId) {
      setEditingTextLayerId(null);
      setTextEditorDraft('');
    }
  };

  const handleToggleLayerLock = (layerId: string) => {
    commitLayers(
      updateLayerById(layersRef.current, layerId, (layer) => ({
        ...layer,
        locked: !layer.locked,
      })),
      'Toggle lock',
    );

    if (editingTextLayerId === layerId) {
      setEditingTextLayerId(null);
      setTextEditorDraft('');
    }
  };

  const handleDeleteLayer = (layerId: string) => {
    const targetLayer = layersRef.current.find((layer) => layer.id === layerId);
    if (!targetLayer || targetLayer.locked) {
      return;
    }

    commitLayers(layersRef.current.filter((layer) => layer.id !== layerId), 'Delete layer');
    setSelectedIds((current) => current.filter((id) => id !== layerId));
    if (editingTextLayerId === layerId) {
      setEditingTextLayerId(null);
      setTextEditorDraft('');
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden font-sans">
      <EditorToolbar
        selectedTool={tool}
        onSelectTool={selectTool}
        onAddText={handleAddText}
        onAddRect={handleAddRect}
        onAddCircle={handleAddCircle}
        onAddDrawingLayer={handleAddDrawingLayer}
        onUpload={() => fileInputRef.current?.click()}
      />

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        className="hidden"
        accept="image/*"
      />
      <input
        type="file"
        ref={projectInputRef}
        onChange={(event) => {
          void handleProjectImport(event);
        }}
        className="hidden"
        accept="application/json,.json"
      />

      <div className="flex-1 flex flex-col relative bg-gray-950">
        <div className="min-h-14 bg-gray-800 border-b border-gray-700 flex flex-wrap items-center px-4 py-2 gap-3">
            <h1 className="font-bold text-xl bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mr-1">
              Edit Now
            </h1>

            <div className="flex h-9 items-center gap-1 bg-gray-900 rounded-md border border-gray-700 px-1">
              <button
                onClick={handleUndo}
                disabled={historyStep === 0}
                className="flex h-7 w-7 items-center justify-center hover:bg-gray-700 rounded text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                title="Undo (Ctrl+Z)"
              >
                <Undo className="w-4 h-4" />
              </button>
              <button
                onClick={handleRedo}
                disabled={historyStep === history.length - 1}
                className="flex h-7 w-7 items-center justify-center hover:bg-gray-700 rounded text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                title="Redo (Ctrl+Shift+Z)"
              >
                <Redo className="w-4 h-4" />
              </button>
            </div>

            <div className="flex h-9 items-center gap-1 bg-gray-900 rounded-md border border-gray-700 px-1">
              <button
                onClick={() => projectInputRef.current?.click()}
                className="flex h-7 w-7 items-center justify-center hover:bg-gray-700 rounded text-gray-400 hover:text-white"
                title="Open project"
              >
                <FolderOpen className="w-4 h-4" />
              </button>
              <button
                onClick={handleProjectExport}
                className="flex h-7 w-7 items-center justify-center hover:bg-gray-700 rounded text-gray-400 hover:text-white"
                title="Save project"
              >
                <Save className="w-4 h-4" />
              </button>
            </div>

            <div className="flex h-9 items-center gap-1 bg-gray-900 px-2 rounded-md border border-gray-700">
              <span className="text-xs text-gray-400">W:</span>
              <input
                type="number"
                value={canvasSize.width}
                onChange={(event) => setCanvasSize({ ...canvasSize, width: Number(event.target.value) })}
                className="h-7 w-12 bg-transparent text-xs outline-none text-center"
              />
              <span className="text-xs text-gray-400 border-l border-gray-700 pl-2">H:</span>
              <input
                type="number"
                value={canvasSize.height}
                onChange={(event) => setCanvasSize({ ...canvasSize, height: Number(event.target.value) })}
                className="h-7 w-12 bg-transparent text-xs outline-none text-center"
              />
            </div>

            <div className="flex h-9 items-center gap-2 bg-gray-900 px-3 rounded-md border border-gray-700">
              <span className="text-xs text-gray-400">Background</span>
              <div className="flex h-7 items-center gap-1 rounded-md bg-gray-950 px-1">
                <button
                  onClick={() => setIsTransparent(true)}
                  className={`h-5 px-2 text-xs rounded transition-colors ${isTransparent ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                  title="Transparent background"
                >
                  Transparent
                </button>
                <button
                  onClick={() => setIsTransparent(false)}
                  className={`h-5 px-2 text-xs rounded transition-colors ${!isTransparent ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                  title="Solid background"
                >
                  Solid
                </button>
              </div>
              {!isTransparent && (
                <div className="relative flex items-center justify-center group">
                  <div
                    className="w-5 h-5 rounded-full border border-gray-600 shadow-sm transition-transform group-hover:scale-110"
                    style={{ backgroundColor: bgColor }}
                  />
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(event) => setBgColor(event.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    title="Change background color"
                  />
                </div>
              )}
            </div>

            <div className="flex h-9 items-center gap-1 bg-gray-900 rounded-md border border-gray-700 px-1">
              <button
                onClick={() => adjustZoom('out')}
                className="flex h-7 w-7 items-center justify-center hover:bg-gray-700 rounded text-gray-400 hover:text-white"
                title="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={fitCanvasToViewport}
                className="h-7 min-w-10 px-1 text-xs text-gray-300 hover:bg-gray-700 rounded"
                title="Fit canvas to viewport (0)"
              >
                Fit
              </button>
              <button
                onClick={resetViewTransform}
                className="h-7 min-w-12 px-1 text-xs text-gray-300 hover:bg-gray-700 rounded"
                title="Actual size 100% (1)"
              >
                {Math.round(viewTransform.scale * 100)}%
              </button>
              <button
                onClick={() => adjustZoom('in')}
                className="flex h-7 w-7 items-center justify-center hover:bg-gray-700 rounded text-gray-400 hover:text-white"
                title="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => setShowHistoryPanel((current) => !current)}
              className={`flex h-9 items-center gap-2 rounded-md border px-3 text-xs transition-colors ${showHistoryPanel ? 'border-blue-500/60 bg-blue-500/15 text-blue-100' : 'border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800'}`}
              title="History"
            >
              <RotateCcw className="h-4 w-4" />
              History
            </button>

            <button
              onClick={() => setShowShortcutHelp((current) => !current)}
              className={`flex h-9 items-center gap-2 rounded-md border px-3 text-xs transition-colors ${showShortcutHelp ? 'border-blue-500/60 bg-blue-500/15 text-blue-100' : 'border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800'}`}
              title="Shortcut help (?)"
            >
              <Keyboard className="h-4 w-4" />
              Shortcuts
            </button>

            {(tool === 'brush' || tool === 'line') && (
              <div className="flex h-9 items-center gap-3 ml-4">
                <div className="h-6 w-[1px] bg-gray-600"></div>
                <span className="text-xs text-gray-400">{tool === 'brush' ? 'Brush:' : 'Line:'}</span>
                <input
                  type="color"
                  value={drawingColor}
                  onChange={(event) => setDrawingColor(event.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent"
                />
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={drawingSize}
                  onChange={(event) => setDrawingSize(Number(event.target.value))}
                  className="w-20 accent-blue-500"
                />
              </div>
            )}
        </div>

        {showShortcutHelp && (
          <div className="absolute right-4 top-[4.5rem] z-30 w-80 rounded-xl border border-gray-700 bg-gray-900/95 p-4 shadow-2xl backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Shortcuts</p>
                <p className="text-xs text-gray-400">Press <span className="font-semibold text-gray-200">?</span> to toggle this panel.</p>
              </div>
              <button
                onClick={() => setShowShortcutHelp(false)}
                className="rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-300">
              {[
                ['V', 'Select tool'],
                ['I', 'Import image'],
                ['B', 'Brush tool'],
                ['L', 'Line tool'],
                ['T', 'Add text'],
                ['R', 'Add rectangle'],
                ['O', 'Add circle'],
                ['N', 'New drawing layer'],
                ['Cmd/Ctrl + C', 'Copy selection'],
                ['Cmd/Ctrl + V', 'Paste'],
                ['Cmd/Ctrl + D', 'Duplicate selection'],
                ['Cmd/Ctrl + A', 'Select all visible'],
                ['Cmd/Ctrl + Z', 'Undo'],
                ['Cmd/Ctrl + Shift + Z', 'Redo'],
                ['Arrow keys', 'Nudge 1px'],
                ['Shift + Arrow', 'Nudge 10px'],
                ['Delete', 'Delete selection'],
                ['0', 'Fit canvas to viewport'],
                ['1', 'Actual size 100%'],
                ['Space + Drag', 'Pan canvas'],
              ].map(([shortcut, description]) => (
                <div key={shortcut} className="rounded-lg border border-gray-800 bg-gray-950/70 px-3 py-2">
                  <p className="font-semibold text-blue-200">{shortcut}</p>
                  <p className="mt-1 text-[11px] text-gray-400">{description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {showHistoryPanel && (
          <div className="absolute right-4 top-[4.5rem] z-30 w-80 rounded-xl border border-gray-700 bg-gray-900/95 p-4 shadow-2xl backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">History</p>
                <p className="text-xs text-gray-400">{history.length} snapshots</p>
              </div>
              <button
                onClick={() => setShowHistoryPanel(false)}
                className="rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="mt-4 max-h-[26rem] space-y-2 overflow-y-auto pr-1">
              {Array.from({ length: history.length }, (_, index) => index).reverse().map((step) => {
                const snapshot = history[step] ?? [];
                const previous = history[step - 1] ?? [];
                const delta = snapshot.length - previous.length;
                const fallbackSummary =
                  delta > 0
                    ? `+${delta} layer`
                    : delta < 0
                      ? `${delta} layer`
                      : 'edit';
                const summary = historyLabels[step] ?? fallbackSummary;

                return (
                  <button
                    key={step}
                    onClick={() => {
                      handleSelectHistoryStep(step);
                    }}
                    className={`w-full rounded border px-3 py-2 text-left text-xs ${step === historyStep ? 'border-blue-500/60 bg-blue-500/15 text-blue-100' : 'border-transparent bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span>Step {step + 1}</span>
                      <span className="text-[10px] text-gray-500">{snapshot.length} layers</span>
                    </div>
                    <div className="mt-1 text-[10px] text-gray-500">{summary}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <EditorCanvas
          canvasSize={canvasSize}
          bgColor={bgColor}
          isTransparent={isTransparent}
          tool={tool}
          layers={visibleLayers}
          draftStroke={draftStroke}
          selectedIds={selectedIds}
          viewTransform={viewTransform}
          stageRef={stageRef}
          transformerRef={transformerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onViewTransformChange={setViewTransform}
          onSelectLayer={selectLayer}
          onSelectLayers={selectLayers}
          onLayerDragEnd={handleLayerDragEnd}
          onLayerTransformEnd={handleLayerTransformEnd}
          editingTextLayerId={activeEditingTextLayerId}
          onStartTextEdit={startTextEditing}
          onCommitTextEdit={commitTextEditing}
          onCancelTextEdit={cancelTextEditing}
          textEditorDraft={textEditorDraft}
          onTextEditorDraftChange={setTextEditorDraft}
        />

        <div className="h-14 bg-gray-800 border-t border-gray-700 flex items-center px-4 gap-3 justify-between z-20">
          <div className="flex h-9 items-center rounded-md border border-gray-700 bg-gray-900 px-3">
            {selectedLayerSummary ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded bg-blue-500/15 px-2 py-1 font-semibold text-blue-200">
                  {selectedLayerSummary.type}
                </span>
                <span className="max-w-40 truncate text-gray-200">{selectedLayerSummary.name}</span>
                <span className="text-gray-500">•</span>
                <span className="text-gray-400">{selectedLayerSummary.detail}</span>
                {selectedLayerSummary.context && (
                  <>
                    <span className="text-gray-500">•</span>
                    <span className="text-cyan-300">{selectedLayerSummary.context}</span>
                  </>
                )}
                {selectedIds.length === 1 && selectedLayer?.locked && <span className="text-amber-300">Locked</span>}
                {selectedIds.length === 1 && selectedLayer && !selectedLayer.visible && <span className="text-rose-300">Hidden</span>}
              </div>
            ) : (
              <span className="text-xs text-gray-400">
                No selection
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-9 items-center gap-2 rounded-md border border-gray-700 bg-gray-900 px-3">
              <span className="text-xs text-gray-400">Export</span>
              <input
                type="text"
                value={exportFileName}
                onChange={(event) => setExportFileName(event.target.value)}
                className="h-6 w-28 rounded bg-transparent px-2 text-[11px] text-gray-200 outline-none border border-gray-700"
                placeholder="filename"
              />
              <select
                value={exportFormat}
                onChange={(event) => setExportFormat(event.target.value as 'png' | 'jpeg')}
                className="h-6 rounded bg-transparent px-1 text-[11px] text-gray-200 outline-none"
              >
                <option value="png">PNG</option>
                <option value="jpeg">JPG</option>
              </select>
              <select
                value={exportScale}
                onChange={(event) => setExportScale(Number(event.target.value))}
                className="h-6 rounded bg-transparent px-1 text-[11px] text-gray-200 outline-none"
              >
                <option value="1">1x</option>
                <option value="2">2x</option>
                <option value="3">3x</option>
                <option value="4">4x</option>
              </select>
              <select
                value={exportBackgroundMode}
                onChange={(event) => setExportBackgroundMode(event.target.value as 'current' | 'transparent' | 'solid')}
                className="h-6 rounded bg-transparent px-1 text-[11px] text-gray-200 outline-none"
              >
                <option value="current">Current BG</option>
                <option value="transparent">Transparent</option>
                <option value="solid">Solid BG</option>
              </select>
              {exportBackgroundMode === 'solid' && (
                <input
                  type="color"
                  value={exportBackgroundColor}
                  onChange={(event) => setExportBackgroundColor(event.target.value)}
                  className="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent"
                />
              )}
              <button
                onClick={handleExport}
                className="flex h-6 items-center gap-2 rounded bg-blue-600 px-3 text-[11px] font-medium text-white transition-colors hover:bg-blue-700 shadow-lg shadow-blue-900/20"
              >
                <Download className="h-3 w-3" /> Export
              </button>
            </div>
          </div>
        </div>
      </div>

      <EditorSidebar
        activePanel={activePanel}
        canvasSize={canvasSize}
        layers={layers}
        selectedIds={selectedIds}
        selectedNestedLayerId={selectedNestedLayerId}
        selectedLayer={selectedLayer}
        onPanelChange={setActivePanel}
        onSelectLayer={selectLayer}
        onSelectNestedLayer={selectNestedLayer}
        onMoveLayer={handleMoveLayer}
        onReorderLayer={handleReorderLayer}
        onDuplicateLayer={handleDuplicateLayer}
        onDeleteLayer={handleDeleteLayer}
        onToggleLayerVisibility={handleToggleLayerVisibility}
        onToggleLayerLock={handleToggleLayerLock}
        onLayerChange={handleLayerUpdate}
        onAlignLayer={handleAlignLayer}
        onBulkVisibility={handleBulkVisibility}
        onBulkLock={handleBulkLock}
        onDeleteSelected={handleDelete}
        onAlignSelection={handleAlignSelection}
        onDistributeSelection={handleDistributeSelection}
        onGroupSelection={handleGroupSelection}
        onUngroupSelection={handleUngroupSelection}
      />
    </div>
  );
};

export default App;
