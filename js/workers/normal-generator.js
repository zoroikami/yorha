self.onmessage = async function(e) {
    const { bitmap, strength } = e.data;
    const w = bitmap.width;
    const h = bitmap.height;

    // Crear canvas fuera de pantalla
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);

    const src = ctx.getImageData(0, 0, w, h);
    const dst = ctx.createImageData(w, h);

    const getLum = (x, y) => {
        x = Math.max(0, Math.min(w - 1, x));
        y = Math.max(0, Math.min(h - 1, y));
        const i = (y * w + x) * 4;
        return (src.data[i] + src.data[i + 1] + src.data[i + 2]) / 3 / 255;
    };

    // Procesar normales en hilo secundario
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const dx = getLum(x + 1, y) - getLum(x - 1, y);
            const dy = getLum(x, y + 1) - getLum(x, y - 1);
            
            const nx = -dx * strength;
            const ny = -dy * strength;
            const nz = 1.0;
            
            const len = Math.sqrt(nx*nx + ny*ny + nz*nz);
            const i = (y * w + x) * 4;
            
            dst.data[i]     = (nx/len * 0.5 + 0.5) * 255;
            dst.data[i + 1] = (ny/len * 0.5 + 0.5) * 255;
            dst.data[i + 2] = (nz/len * 0.5 + 0.5) * 255;
            dst.data[i + 3] = 255;
        }
    }

    ctx.putImageData(dst, 0, 0);

    // Transferir de vuelta como ImageBitmap (costo de copia cero)
    const outBitmap = canvas.transferToImageBitmap();
    self.postMessage({ bitmap: outBitmap }, [outBitmap]);
};
