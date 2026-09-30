/**
 * Thermal Receipt Image Preprocessor for OCR
 * Converts receipt photos to high-contrast grayscale to maximize Tesseract accuracy.
 */

export const preprocessImageForOcr = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Scale image if too large or too small for optimal OCR (e.g. max width 2000px)
          let width = img.width;
          let height = img.height;
          const maxDim = 2000;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;

          // Draw image to canvas
          ctx.drawImage(img, 0, 0, width, height);

          // Get image pixel data
          const imgData = ctx.getImageData(0, 0, width, height);
          const d = imgData.data;

          // Grayscale & Contrast enhancement
          // Contrast factor (1.4 is high contrast)
          const contrast = 1.4;
          const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

          for (let i = 0; i < d.length; i += 4) {
            // Standard luminance: 0.299 R + 0.587 G + 0.114 B
            const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            // Apply contrast
            let adjusted = factor * (gray - 128) + 128;
            if (adjusted < 0) adjusted = 0;
            if (adjusted > 255) adjusted = 255;

            d[i] = adjusted;     // R
            d[i + 1] = adjusted; // G
            d[i + 2] = adjusted; // B
            // Alpha stays d[i + 3]
          }

          ctx.putImageData(imgData, 0, 0);

          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              resolve(file); // Fallback to original
            }
          }, 'image/png');
        } catch (err) {
          console.warn('Preprocessing failed, using original:', err);
          resolve(file);
        }
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
};
