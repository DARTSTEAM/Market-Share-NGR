# 📊 NGR Market Share - Guía para Colaboradores

¡Bienvenido al proyecto! Este dashboard automatizado procesa reportes consolidados en CSV y los visualiza en tiempo real. Aquí tienes todo lo necesario para empezar a trabajar.

## 🔗 Enlaces Importantes
- **Repositorio:** [DARTSTEAM/Market-Share-NGR](https://github.com/DARTSTEAM/Market-Share-NGR)
- **URL en Vivo:** [ngr-market-share.web.app](https://ngr-market-share.web.app/)

---

## 🛠 Entorno de Desarrollo

1. **Clonar el repo:**
   ```bash
   git clone https://github.com/DARTSTEAM/Market-Share-NGR.git
   cd Market-Share-NGR
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Correr en local:**
   ```bash
   npm run dev
   ```

---

## 📅 Cómo Actualizar los Datos

El dashboard no lee el CSV directamente en el navegador por performance. Usa un script intermedio que genera un JSON optimizado.

1. Reemplaza el archivo `public/data.csv` con el nuevo reporte (debe mantener el mismo nombre).
2. Procesa los datos localmente para ver los cambios:
   ```bash
   node process_csv.cjs
   ```
3. Verifica que la tabla y gráficos se vean bien en tu `localhost`.

---

## 🚀 Flujo de Publicación (CI/CD)

**No necesitas desplegar manualmente a Firebase.** Todo está automatizado con GitHub Actions.

### Para cambios menores:
1. Haz tus cambios en el código (`src/App.jsx`, etc.) o actualiza el CSV.
2. Sube a la rama principal:
   ```bash
   git add .
   git commit -m "Descripción clara del cambio"
   git push origin master
   ```
3. Al hacer el push, GitHub iniciará el "Action" automáticamente. En **2 minutos**, la web se actualizará sola.

### Para cambios grandes:
1. Crea una rama nueva: `git checkout -b mejora-grafico`.
2. Sube la rama y abre un **Pull Request (PR)** en GitHub.
3. El sistema te responderá en el PR con una **Preview URL** temporal para que Agus revise el cambio antes de pasarlo a producción.

---

## 🗂 Estructura del Proyecto
- `src/App.jsx`: UI principal y lógica del Dashboard.
- `process_csv.cjs`: Script en Node que limpia y agrupa la data del CSV.
- `src/data.json`: El archivo que consume el frontend (se genera automáticamente).
- `public/data.csv`: Tu fuente de verdad.

---

**Nota:** Si el despliegue falla, revisa la pestaña **Actions** en GitHub para ver el log de errores.
