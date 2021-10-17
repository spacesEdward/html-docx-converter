
export interface ImageSize {
  width: number;
  height: number;
}

export const resize = (actual: ImageSize, max: ImageSize): ImageSize => {
  const scaled = { ...actual };

  if (scaled.width > max.width) {
    scaled.width = max.width;
    scaled.height = (max.width * actual.height) / actual.width;
  }
  if (scaled.height > max.height) {
    scaled.width = (max.height * actual.width) / actual.height;
    scaled.height = max.height;
  }

  return scaled;
};
