import React, { useEffect, useRef } from 'react';
import { Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import type { ImageLayer, Point } from '../types';

interface FilteredImageProps extends Omit<ImageLayer, 'type'> {
  onSelect: (event?: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onDragMove?: (position: Point) => void;
  onDragEnd: (position: Point) => void;
  onTransformEnd: (node: Konva.Node) => void;
  draggable: boolean;
}

const FilteredImage: React.FC<FilteredImageProps> = ({ 
  image, x, y, width, height, rotation, opacity, cropX, cropY, cropWidth, cropHeight, flipX, flipY,
  id,
  brightness = 0, contrast = 0, blur = 0, saturation = 0,
  onSelect, onDragMove, onDragEnd, onTransformEnd, draggable 
}) => {
  const imageRef = useRef<Konva.Image>(null);
  const hasFilters = brightness !== 0 || contrast !== 0 || blur !== 0 || saturation !== 0;

  // Keep Konva cache in sync so crop/filter changes redraw immediately.
  useEffect(() => {
    if (imageRef.current) {
      imageRef.current.clearCache();
      if (hasFilters) {
        imageRef.current.cache();
      }
      imageRef.current.getLayer()?.batchDraw();
    }
  }, [image, width, height, cropX, cropY, cropWidth, cropHeight, brightness, contrast, blur, saturation, hasFilters]);

  return (
    <KonvaImage
      ref={imageRef}
      id={id}
      image={image}
      x={x}
      y={y}
      width={width}
      height={height}
      cropX={cropX}
      cropY={cropY}
      cropWidth={cropWidth}
      cropHeight={cropHeight}
      offsetX={flipX ? width : 0}
      offsetY={flipY ? height : 0}
      scaleX={flipX ? -1 : 1}
      scaleY={flipY ? -1 : 1}
      rotation={rotation}
      opacity={opacity}
      draggable={draggable}
      onClick={onSelect}
      onTap={onSelect}
      onDragMove={(event) => onDragMove?.({ x: event.target.x(), y: event.target.y() })}
      onDragEnd={(event) => onDragEnd({ x: event.target.x(), y: event.target.y() })}
      onTransformEnd={(event) => onTransformEnd(event.target)}
      filters={hasFilters ? [
        Konva.Filters.Brighten,
        Konva.Filters.Contrast,
        Konva.Filters.Blur,
        Konva.Filters.HSV,
      ] : []}
      brightness={brightness}
      contrast={contrast}
      blurRadius={blur}
      saturation={saturation}
    />
  );
};

export default FilteredImage;
