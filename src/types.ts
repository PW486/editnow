export type LayerType = 'image' | 'text' | 'rect' | 'circle' | 'line';

export interface BaseLayer {
  id: string;
  type: LayerType;
  x: number;
  y: number;
  rotation: number;
  name: string;
  visible: boolean;
}

export interface ImageLayer extends BaseLayer {
  type: 'image';
  image: HTMLImageElement;
  width: number;
  height: number;
}

export interface TextLayer extends BaseLayer {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fill: string;
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

export type LayerItem = ImageLayer | TextLayer | RectLayer | CircleLayer | LineLayer;

export type ToolType = 'select' | 'brush' | 'text' | 'rect' | 'circle' | 'eraser';
