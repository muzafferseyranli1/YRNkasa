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
          const maxDim = 2600;
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

          // Gri tonlama
          const gray = new Float32Array(width * height);
          for (let i = 0, p = 0; i < d.length; i += 4, p++) {
            gray[p] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          }

          // Adaptif eşikleme (integral görüntü ile yerel ortalama): fiş üzerindeki gölge / parlama
          // global kontrast ayarında yazıları siliyordu; yerel eşik her bölgeyi kendi ışığına göre ayırır.
          const integral = new Float64Array((width + 1) * (height + 1));
          for (let y = 0; y < height; y++) {
            let rowSum = 0;
            for (let x = 0; x < width; x++) {
              rowSum += gray[y * width + x];
              integral[(y + 1) * (width + 1) + (x + 1)] = integral[y * (width + 1) + (x + 1)] + rowSum;
            }
          }
          const r = Math.max(12, Math.round(Math.min(width, height) / 24));
          const bias = 0.92; // ortalamanın %8 altı = mürekkep
          for (let y = 0; y < height; y++) {
            const y0 = Math.max(0, y - r);
            const y1 = Math.min(height - 1, y + r);
            for (let x = 0; x < width; x++) {
              const x0 = Math.max(0, x - r);
              const x1 = Math.min(width - 1, x + r);
              const area = (x1 - x0 + 1) * (y1 - y0 + 1);
              const sum =
                integral[(y1 + 1) * (width + 1) + (x1 + 1)] -
                integral[y0 * (width + 1) + (x1 + 1)] -
                integral[(y1 + 1) * (width + 1) + x0] +
                integral[y0 * (width + 1) + x0];
              // Yumuşak eşik: yerel arka plana oran 0.55 (mürekkep) .. 0.95 (kağıt) arasında 0..255'e gerilir.
              // Sert siyah/beyaz yerine gri geçişleri korumak Tesseract'ın rakamları ayırmasına yardım eder.
              const ratio = gray[y * width + x] / ((sum / area) * bias + 1e-6);
              const t = Math.min(1, Math.max(0, (ratio - 0.55) / 0.4));
              const v = Math.round(t * t * (3 - 2 * t) * 255);
              const o = (y * width + x) * 4;
              d[o] = d[o + 1] = d[o + 2] = v;
            }
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
