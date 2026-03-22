import type {
  BaseLayer,
  CanvasSize,
  CircleLayer,
  DrawingLayer,
  DrawingStroke,
  GroupLayer,
  ImageLayer,
  LayerItem,
  LineLayer,
  Point,
  RectLayer,
  TextLayer,
} from '../types';

const createId = (prefix: string) => `${prefix}-${Date.now()}`;
const DUPLICATE_OFFSET = 24;
type LayerBounds = { left: number; right: number; top: number; bottom: number };

export const createImageLayer = (
  fileName: string,
  image: HTMLImageElement,
  canvasSize: CanvasSize,
  src: string,
): ImageLayer => ({
  id: createId('img'),
  type: 'image',
  image,
  src,
  x: canvasSize.width / 2 - image.width / 4,
  y: canvasSize.height / 2 - image.height / 4,
  width: image.width / 2,
  height: image.height / 2,
  cropX: 0,
  cropY: 0,
  cropWidth: image.width,
  cropHeight: image.height,
  flipX: false,
  flipY: false,
  rotation: 0,
  opacity: 1,
  name: fileName,
  visible: true,
  locked: false,
  brightness: 0,
  contrast: 0,
  blur: 0,
  saturation: 0,
});

export const createTextLayer = (canvasSize: CanvasSize): TextLayer => ({
  id: createId('text'),
  type: 'text',
  text: 'Double click to edit',
  x: canvasSize.width / 2 - 100,
  y: canvasSize.height / 2,
  rotation: 0,
  opacity: 1,
  fontSize: 24,
  fontFamily: 'Arial',
  fill: '#000000',
  align: 'left',
  lineHeight: 1.2,
  width: 220,
  name: 'Text Layer',
  visible: true,
  locked: false,
});

export const createRectLayer = (canvasSize: CanvasSize): RectLayer => ({
  id: createId('rect'),
  type: 'rect',
  x: canvasSize.width / 2 - 50,
  y: canvasSize.height / 2 - 50,
  width: 100,
  height: 100,
  rotation: 0,
  opacity: 1,
  fill: '#3b82f6',
  stroke: '#2563eb',
  strokeWidth: 2,
  name: 'Rectangle',
  visible: true,
  locked: false,
});

export const createCircleLayer = (canvasSize: CanvasSize): CircleLayer => ({
  id: createId('circle'),
  type: 'circle',
  x: canvasSize.width / 2,
  y: canvasSize.height / 2,
  radius: 50,
  rotation: 0,
  opacity: 1,
  fill: '#ef4444',
  stroke: '#dc2626',
  strokeWidth: 2,
  name: 'Circle',
  visible: true,
  locked: false,
});

export const createDrawingStroke = (
  point: Point,
  color: string,
  size: number,
): DrawingStroke => ({
  points: [point.x, point.y],
  stroke: color,
  strokeWidth: size,
  tension: 0.5,
  lineCap: 'round',
  lineJoin: 'round',
});

export const createDrawingLayer = (): DrawingLayer => ({
  id: createId('drawing'),
  type: 'drawing',
  x: 0,
  y: 0,
  rotation: 0,
  opacity: 1,
  name: 'Drawing Layer',
  visible: true,
  locked: false,
  strokes: [],
});

export const createStraightLineLayer = (
  point: Point,
  color: string,
  size: number,
): LineLayer => ({
  id: createId('line'),
  type: 'line',
  points: [point.x, point.y, point.x, point.y],
  stroke: color,
  strokeWidth: size,
  tension: 0,
  lineCap: 'round',
  lineJoin: 'round',
  x: 0,
  y: 0,
  rotation: 0,
  opacity: 1,
  name: 'Line',
  visible: true,
  locked: false,
});

export const appendPointToLine = (layer: LineLayer, point: Point): LineLayer => ({
  ...layer,
  points: [...layer.points, point.x, point.y],
});

export const appendPointToStroke = (stroke: DrawingStroke, point: Point): DrawingStroke => ({
  ...stroke,
  points: [...stroke.points, point.x, point.y],
});

export const updateStraightLineEndpoint = (layer: LineLayer, point: Point): LineLayer => ({
  ...layer,
  points: [layer.points[0] ?? point.x, layer.points[1] ?? point.y, point.x, point.y],
});

export const updateLayerById = (
  layers: LayerItem[],
  layerId: string,
  updater: (layer: LayerItem) => LayerItem,
): LayerItem[] =>
  layers.map((layer) => (layer.id === layerId ? updater(layer) : layer));

export const findLayerByIdDeep = (layers: LayerItem[], layerId: string): LayerItem | null => {
  for (const layer of layers) {
    if (layer.id === layerId) {
      return layer;
    }

    if (layer.type === 'group') {
      const nested = findLayerByIdDeep(layer.children, layerId);
      if (nested) {
        return nested;
      }
    }
  }

  return null;
};

export const updateLayerByIdDeep = (
  layers: LayerItem[],
  layerId: string,
  updater: (layer: LayerItem) => LayerItem,
): LayerItem[] =>
  layers.map((layer) => {
    if (layer.id === layerId) {
      return updater(layer);
    }

    if (layer.type !== 'group') {
      return layer;
    }

    return {
      ...layer,
      children: updateLayerByIdDeep(layer.children, layerId, updater),
    };
  });

export const removeLayerByIdDeep = (
  layers: LayerItem[],
  layerId: string,
): LayerItem[] =>
  layers.reduce<LayerItem[]>((acc, layer) => {
    if (layer.id === layerId) {
      return acc;
    }

    if (layer.type !== 'group') {
      acc.push(layer);
      return acc;
    }

    acc.push({
      ...layer,
      children: removeLayerByIdDeep(layer.children, layerId),
    });
    return acc;
  }, []);

export const getLayerLocalBounds = (layer: LayerItem): LayerBounds => {
  if (layer.type === 'group') {
    if (layer.children.length === 0) {
      return { left: 0, right: 0, top: 0, bottom: 0 };
    }

    return layer.children.reduce(
      (acc, child) => {
        const bounds = getLayerLocalBounds(child);
        return {
          left: Math.min(acc.left, child.x + bounds.left),
          right: Math.max(acc.right, child.x + bounds.right),
          top: Math.min(acc.top, child.y + bounds.top),
          bottom: Math.max(acc.bottom, child.y + bounds.bottom),
        };
      },
      { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity },
    );
  }

  if (layer.type === 'image' || layer.type === 'rect') {
    return {
      left: 0,
      right: layer.width,
      top: 0,
      bottom: layer.height,
    };
  }

  if (layer.type === 'circle') {
    return {
      left: -layer.radius,
      right: layer.radius,
      top: -layer.radius,
      bottom: layer.radius,
    };
  }

  if (layer.type === 'line') {
    const pointsX = layer.points.filter((_, index) => index % 2 === 0);
    const pointsY = layer.points.filter((_, index) => index % 2 === 1);
    return {
      left: Math.min(...pointsX),
      right: Math.max(...pointsX),
      top: Math.min(...pointsY),
      bottom: Math.max(...pointsY),
    };
  }

  if (layer.type === 'drawing') {
    if (layer.strokes.length === 0) {
      return {
        left: 0,
        right: 180,
        top: 0,
        bottom: 120,
      };
    }

    const pointsX = layer.strokes.flatMap((stroke) => stroke.points.filter((_, index) => index % 2 === 0));
    const pointsY = layer.strokes.flatMap((stroke) => stroke.points.filter((_, index) => index % 2 === 1));
    return {
      left: Math.min(...pointsX),
      right: Math.max(...pointsX),
      top: Math.min(...pointsY),
      bottom: Math.max(...pointsY),
    };
  }

  const estimatedWidth = layer.width ?? Math.max(layer.text.length * layer.fontSize * 0.62, 48);
  const lineCount = Math.max(layer.text.split('\n').length, 1);
  const estimatedHeight = Math.max(layer.fontSize * layer.lineHeight * lineCount, 24);
  return {
    left: 0,
    right: estimatedWidth,
    top: 0,
    bottom: estimatedHeight,
  };
};

export const alignLayerToCanvas = (
  layer: LayerItem,
  canvasSize: CanvasSize,
  alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom',
): BaseLayer['x' | 'y'] extends never ? never : Pick<BaseLayer, 'x' | 'y'> => {
  const bounds = getLayerLocalBounds(layer);
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;

  if (alignment === 'left') {
    return { x: -bounds.left, y: layer.y };
  }

  if (alignment === 'center') {
    return { x: canvasSize.width / 2 - width / 2 - bounds.left, y: layer.y };
  }

  if (alignment === 'right') {
    return { x: canvasSize.width - width - bounds.left, y: layer.y };
  }

  if (alignment === 'top') {
    return { x: layer.x, y: -bounds.top };
  }

  if (alignment === 'middle') {
    return { x: layer.x, y: canvasSize.height / 2 - height / 2 - bounds.top };
  }

  return { x: layer.x, y: canvasSize.height - height - bounds.top };
};

const getLayerWorldBounds = (layer: LayerItem): LayerBounds => {
  const bounds = getLayerLocalBounds(layer);
  return {
    left: layer.x + bounds.left,
    right: layer.x + bounds.right,
    top: layer.y + bounds.top,
    bottom: layer.y + bounds.bottom,
  };
};

export const createGroupLayer = (layers: LayerItem[]): GroupLayer => {
  const bounds = layers.reduce(
    (acc, layer) => {
      const layerBounds = getLayerWorldBounds(layer);
      return {
        left: Math.min(acc.left, layerBounds.left),
        right: Math.max(acc.right, layerBounds.right),
        top: Math.min(acc.top, layerBounds.top),
        bottom: Math.max(acc.bottom, layerBounds.bottom),
      };
    },
    { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity },
  );

  return {
    id: createId('group'),
    type: 'group',
    x: bounds.left,
    y: bounds.top,
    rotation: 0,
    opacity: 1,
    name: `Group (${layers.length})`,
    visible: true,
    locked: false,
    children: layers.map((layer) => ({
      ...layer,
      x: layer.x - bounds.left,
      y: layer.y - bounds.top,
    })),
  };
};

export const ungroupLayer = (group: GroupLayer): LayerItem[] =>
  group.children.map((child) => ({
    ...child,
    x: group.x + child.x,
    y: group.y + child.y,
  }));

export const alignLayersToSelection = (
  layers: LayerItem[],
  selectedIds: string[],
  alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom',
): LayerItem[] => {
  const selectedLayers = layers.filter((layer) => selectedIds.includes(layer.id) && !layer.locked);
  if (selectedLayers.length < 2) {
    return layers;
  }

  const selectionBounds = selectedLayers.reduce(
    (acc, layer) => {
      const bounds = getLayerWorldBounds(layer);
      return {
        left: Math.min(acc.left, bounds.left),
        right: Math.max(acc.right, bounds.right),
        top: Math.min(acc.top, bounds.top),
        bottom: Math.max(acc.bottom, bounds.bottom),
      };
    },
    { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity },
  );

  return layers.map((layer) => {
    if (!selectedIds.includes(layer.id) || layer.locked) {
      return layer;
    }

    const bounds = getLayerLocalBounds(layer);
    const width = bounds.right - bounds.left;
    const height = bounds.bottom - bounds.top;

    if (alignment === 'left') {
      return { ...layer, x: selectionBounds.left - bounds.left };
    }
    if (alignment === 'center') {
      return { ...layer, x: (selectionBounds.left + selectionBounds.right) / 2 - width / 2 - bounds.left };
    }
    if (alignment === 'right') {
      return { ...layer, x: selectionBounds.right - width - bounds.left };
    }
    if (alignment === 'top') {
      return { ...layer, y: selectionBounds.top - bounds.top };
    }
    if (alignment === 'middle') {
      return { ...layer, y: (selectionBounds.top + selectionBounds.bottom) / 2 - height / 2 - bounds.top };
    }

    return { ...layer, y: selectionBounds.bottom - height - bounds.top };
  });
};

export const distributeLayersInSelection = (
  layers: LayerItem[],
  selectedIds: string[],
  axis: 'horizontal' | 'vertical',
): LayerItem[] => {
  const selectedLayers = layers.filter((layer) => selectedIds.includes(layer.id) && !layer.locked);
  if (selectedLayers.length < 3) {
    return layers;
  }

  const ordered = [...selectedLayers].sort((a, b) => {
    const aBounds = getLayerWorldBounds(a);
    const bBounds = getLayerWorldBounds(b);
    const aCenter = axis === 'horizontal' ? (aBounds.left + aBounds.right) / 2 : (aBounds.top + aBounds.bottom) / 2;
    const bCenter = axis === 'horizontal' ? (bBounds.left + bBounds.right) / 2 : (bBounds.top + bBounds.bottom) / 2;
    return aCenter - bCenter;
  });

  const firstBounds = getLayerWorldBounds(ordered[0]);
  const lastBounds = getLayerWorldBounds(ordered[ordered.length - 1]);
  const firstCenter = axis === 'horizontal' ? (firstBounds.left + firstBounds.right) / 2 : (firstBounds.top + firstBounds.bottom) / 2;
  const lastCenter = axis === 'horizontal' ? (lastBounds.left + lastBounds.right) / 2 : (lastBounds.top + lastBounds.bottom) / 2;
  const step = (lastCenter - firstCenter) / (ordered.length - 1);

  const centerMap = new Map<string, number>();
  ordered.forEach((layer, index) => {
    centerMap.set(layer.id, firstCenter + step * index);
  });

  return layers.map((layer) => {
    const nextCenter = centerMap.get(layer.id);
    if (nextCenter === undefined) {
      return layer;
    }

    const bounds = getLayerLocalBounds(layer);
    const width = bounds.right - bounds.left;
    const height = bounds.bottom - bounds.top;

    return axis === 'horizontal'
      ? { ...layer, x: nextCenter - width / 2 - bounds.left }
      : { ...layer, y: nextCenter - height / 2 - bounds.top };
  });
};

export const moveLayer = (
  layers: LayerItem[],
  layerId: string,
  direction: 'up' | 'down',
): LayerItem[] => {
  const index = layers.findIndex((layer) => layer.id === layerId);
  if (index === -1) {
    return layers;
  }

  const targetIndex = direction === 'up' ? index + 1 : index - 1;
  if (targetIndex < 0 || targetIndex >= layers.length) {
    return layers;
  }

  const nextLayers = [...layers];
  [nextLayers[index], nextLayers[targetIndex]] = [nextLayers[targetIndex], nextLayers[index]];
  return nextLayers;
};

export const reorderLayer = (
  layers: LayerItem[],
  layerId: string,
  position: 'front' | 'back',
): LayerItem[] => {
  const index = layers.findIndex((layer) => layer.id === layerId);
  if (index === -1) {
    return layers;
  }

  const nextLayers = [...layers];
  const [layer] = nextLayers.splice(index, 1);
  if (!layer) {
    return layers;
  }

  if (position === 'front') {
    nextLayers.push(layer);
  } else {
    nextLayers.unshift(layer);
  }

  return nextLayers;
};

export const duplicateLayer = (layer: LayerItem): LayerItem => {
  const duplicatedBase = {
    id: createId(layer.type),
    x: layer.x + DUPLICATE_OFFSET,
    y: layer.y + DUPLICATE_OFFSET,
    name: `${layer.name} Copy`,
    visible: true,
    locked: false,
  };

  switch (layer.type) {
    case 'image':
      return {
        ...layer,
        ...duplicatedBase,
      };
    case 'text':
      return {
        ...layer,
        ...duplicatedBase,
      };
    case 'rect':
      return {
        ...layer,
        ...duplicatedBase,
      };
    case 'circle':
      return {
        ...layer,
        ...duplicatedBase,
      };
    case 'line':
      return {
        ...layer,
        ...duplicatedBase,
        points: [...layer.points],
      };
    case 'drawing':
      return {
        ...layer,
        ...duplicatedBase,
        strokes: layer.strokes.map((stroke) => ({
          ...stroke,
          points: [...stroke.points],
        })),
      };
    case 'group':
      return {
        ...layer,
        ...duplicatedBase,
        children: layer.children.map((child) => duplicateLayer({
          ...child,
          id: child.id,
          x: child.x - DUPLICATE_OFFSET,
          y: child.y - DUPLICATE_OFFSET,
          name: child.name.replace(/ Copy$/, ''),
        })),
      };
  }
};
