export type LayerType = 'image' | 'text' | 'rect' | 'circle' | 'line' | 'drawing' | 'group';
export type ToolType = 'select' | 'brush' | 'line' | 'text' | 'rect' | 'circle';
export type ActivePanel = 'layers' | 'properties' | 'history';

export interface CanvasSize {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface ViewTransform {
  scale: number;
  position: Point;
}

export interface BaseLayer {
  id: string;
  type: LayerType;
  x: number;
  y: number;
  rotation: number;
  opacity: number;
  name: string;
  visible: boolean;
  locked: boolean;
}

export interface ImageLayer extends BaseLayer {
  type: 'image';
  image: HTMLImageElement;
  src: string;
  width: number;
  height: number;
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  flipX: boolean;
  flipY: boolean;
  // Filters
  brightness?: number; // -1 to 1
  contrast?: number;   // -100 to 100
  blur?: number;       // 0 to 40
  saturation?: number; // -2 to 10
}

export interface TextLayer extends BaseLayer {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fill: string;
  align: 'left' | 'center' | 'right';
  lineHeight: number;
  width?: number; // for wrapping (optional)
}

export interface RectLayer extends BaseLayer {
  type: 'rect';
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export interface CircleLayer extends BaseLayer {
  type: 'circle';
  radius: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export interface LineLayer extends BaseLayer {
  type: 'line';
  points: number[];
  stroke: string;
  strokeWidth: number;
  tension: number;
  lineCap: 'round' | 'butt' | 'square';
  lineJoin: 'round' | 'bevel' | 'miter';
}

export interface DrawingStroke {
  points: number[];
  stroke: string;
  strokeWidth: number;
  tension: number;
  lineCap: 'round' | 'butt' | 'square';
  lineJoin: 'round' | 'bevel' | 'miter';
}

export interface DrawingLayer extends BaseLayer {
  type: 'drawing';
  strokes: DrawingStroke[];
}

export interface GroupLayer extends BaseLayer {
  type: 'group';
  children: LayerItem[];
}

export type LayerItem = ImageLayer | TextLayer | RectLayer | CircleLayer | LineLayer | DrawingLayer | GroupLayer;
