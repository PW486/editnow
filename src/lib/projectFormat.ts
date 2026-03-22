import type { CanvasSize, GroupLayer, ImageLayer, LayerItem } from '../types';

const PROJECT_VERSION = 1;

interface SerializedBaseLayer {
  id: string;
  type: LayerItem['type'];
  x: number;
  y: number;
  rotation: number;
  opacity: number;
  name: string;
  visible: boolean;
  locked: boolean;
}

interface SerializedImageLayer extends SerializedBaseLayer {
  type: 'image';
  src: string;
  width: number;
  height: number;
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  flipX: boolean;
  flipY: boolean;
  brightness?: number;
  contrast?: number;
  blur?: number;
  saturation?: number;
}

type SerializedLayer = SerializedImageLayer | Omit<Exclude<LayerItem, ImageLayer>, 'image'>;

export interface SerializedProject {
  version: number;
  canvasSize: CanvasSize;
  bgColor: string;
  isTransparent: boolean;
  layers: SerializedLayer[];
}

const loadImageElement = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image asset: ${src.slice(0, 64)}`));
    image.src = src;
  });

const serializeLayer = (layer: LayerItem): SerializedLayer => {
  if (layer.type === 'image') {
    return {
      ...layer,
      src: layer.src,
    };
  }

  if (layer.type === 'line') {
    return {
      ...layer,
      points: [...layer.points],
    } as SerializedLayer;
  }

  if (layer.type === 'group') {
    return {
      ...layer,
      children: layer.children.map((child) => serializeLayer(child)),
    } as SerializedLayer;
  }

  return { ...layer };
};

export const serializeLayers = (layers: LayerItem[]): SerializedLayer[] =>
  layers.map((layer) => serializeLayer(layer));

export const serializeProject = (project: Omit<SerializedProject, 'version'>): SerializedProject => ({
  version: PROJECT_VERSION,
  ...project,
});

const deserializeLayer = async (layer: SerializedLayer): Promise<LayerItem> => {
  if (layer.type === 'image') {
    const image = await loadImageElement(layer.src);
    return {
      ...layer,
      image,
    } as ImageLayer;
  }

  if (layer.type === 'group') {
    const group = layer as GroupLayer & { children: SerializedLayer[] };
    const children = await Promise.all(group.children.map((child) => deserializeLayer(child)));
    return {
      ...group,
      children,
    };
  }

  return layer as LayerItem;
};

export const deserializeProject = async (
  project: SerializedProject,
): Promise<Omit<SerializedProject, 'version'> & { layers: LayerItem[] }> => {
  const layers = await Promise.all(project.layers.map((layer) => deserializeLayer(layer)));

  return {
    canvasSize: project.canvasSize,
    bgColor: project.bgColor,
    isTransparent: project.isTransparent,
    layers,
  };
};

export const isSerializedProject = (value: unknown): value is SerializedProject => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<SerializedProject>;
  return (
    candidate.version === PROJECT_VERSION &&
    typeof candidate.bgColor === 'string' &&
    typeof candidate.isTransparent === 'boolean' &&
    typeof candidate.canvasSize?.width === 'number' &&
    typeof candidate.canvasSize?.height === 'number' &&
    Array.isArray(candidate.layers)
  );
};
