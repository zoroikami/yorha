import os
import requests

bg_dir = r"c:\wamp64\www\ispep\img\bg"
os.makedirs(bg_dir, exist_ok=True)

images = [
    {
        "id": "carina",
        "url": "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=2560&auto=format&fit=crop",
        "title": "Nebulosa Rosetta / Carina",
        "desc": "Una vasta región de formación estelar. Las nubes de gas y polvo colapsan para formar nuevas estrellas, ionizando el gas circundante.",
        "source": "Unsplash - Astronomía"
    },
    {
        "id": "milky_way",
        "url": "https://images.unsplash.com/photo-1464802686167-b939a6910659?q=80&w=2560&auto=format&fit=crop",
        "title": "Vía Láctea (Centro Galáctico)",
        "desc": "El núcleo de nuestra galaxia, hogar de Sagitario A*, un agujero negro supermasivo, rodeado por densos cúmulos de estrellas y polvo oscuro.",
        "source": "Unsplash - Observación Astronómica"
    },
    {
        "id": "deep_space",
        "url": "https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?q=80&w=2560&auto=format&fit=crop",
        "title": "Cielo Profundo",
        "desc": "Múltiples estrellas y constelaciones visibles en el espectro visible, mostrando la inmensidad del espacio profundo.",
        "source": "Unsplash - Cielo Profundo"
    },
    {
        "id": "andromeda",
        "url": "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?q=80&w=2560&auto=format&fit=crop",
        "title": "Galaxia Espiral",
        "desc": "Una galaxia espiral con brazos bien definidos, repletos de gas interestelar, cúmulos abiertos y regiones H II de intensa formación estelar.",
        "source": "Unsplash - Galaxias"
    },
    {
        "id": "nebula_colorful",
        "url": "https://images.unsplash.com/photo-1610296669228-602fa827fc1f?q=80&w=2560&auto=format&fit=crop",
        "title": "Remanente de Supernova",
        "desc": "Gases eyectados a velocidades supersónicas tras la explosión de una estrella masiva, creando estructuras complejas en el medio interestelar.",
        "source": "Unsplash - Astrofotografía"
    }
]

for img in images:
    path = os.path.join(bg_dir, f"{img['id']}.jpg")
    if not os.path.exists(path):
        print(f"Downloading {img['id']}...")
        response = requests.get(img['url'], stream=True)
        with open(path, 'wb') as f:
            for chunk in response.iter_content(1024):
                f.write(chunk)
        print(f"Saved {path}")
    else:
        print(f"{path} already exists.")
