# `index.js` — Efecto de Video Ping-Pong

> **Ruta:** `/js/index.js`  
> **Tipo:** JavaScript (script clásico)  
> **Tamaño:** 784 bytes (27 líneas)  
> **Página:** `index.html`

---

## Propósito

Crea un efecto de **reproducción ida-y-vuelta** ("ping-pong") en el video de fondo de la landing page. El video se reproduce normalmente hasta el final, luego retrocede frame a frame hasta el inicio, y vuelve a empezar — generando un **loop infinito sin cortes visibles**.

---

## Funcionamiento

```
   ▶ FORWARD ▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶  │  ◀ REVERSE ◀◀◀◀◀◀◀◀◀◀◀◀◀◀◀◀◀
                                   │
   video.play()                    │  reverseVideo()
   direction = 1                   │  direction = -1
   Reproducción nativa del browser │  currentTime -= 0.03
                                   │  setTimeout(33ms) → ~30 FPS
                                   │
   Trigger: currentTime ≥ end-0.2  │  Trigger: currentTime ≤ 0.1
```

---

## Código

```javascript
document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('saturn-video');
    if (!video) return;

    let direction = 1;

    video.addEventListener('timeupdate', function () {
        if (direction === 1 && video.currentTime >= video.duration - 0.2) {
            direction = -1;
            reverseVideo();
        } else if (direction === -1 && video.currentTime <= 0.1) {
            direction = 1;
            video.play();
        }
    });

    function reverseVideo() {
        if (direction === -1) {
            video.currentTime -= 0.03;
            if (video.currentTime > 0) {
                setTimeout(reverseVideo, 33);  // 30 FPS
            }
        }
    }
});
```

---

## Detalles Técnicos

| Aspecto | Valor | Razón |
|---------|-------|-------|
| Umbral de fin | `duration - 0.2s` | Evita que el último frame negro se muestre |
| Umbral de inicio | `0.1s` | Evita overshoot negativo |
| Decremento | `0.03s` | Retroceso suave por iteración |
| Intervalo | `33ms` | ≈30 FPS para una inversión fluida |

---

## Contexto de Uso

El video controlado es `#saturn-video` en `index.html`, que en realidad reproduce `img/tierra.mp4`:

```html
<video id="saturn-video" autoplay loop muted playsinline
       class="fixed inset-0 z-0 w-full h-full object-cover opacity-60">
    <source src="img/tierra.mp4" type="video/mp4">
</video>
```

> **Nota:** El `id` dice "saturn" pero el archivo es "tierra.mp4" — esto es un remanente de cuando el video era de Saturno.

---

## Limitaciones

- El atributo `loop` del `<video>` sigue activo, lo cual podría interferir con el efecto ping-pong si el evento `timeupdate` no se dispara a tiempo
- La inversión por `setTimeout` no es precisa en cuanto a frame timing
- No hay control de rendimiento: en pestañas inactivas, `setTimeout` puede ser throttled a 1s
