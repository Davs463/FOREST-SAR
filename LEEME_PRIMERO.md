# BosqueVivo HN — repositorio limpio + departamento Claude Code v4.1

Este paquete **ya contiene la aplicación React/Vite actual** y todas las instrucciones de agentes. Extrae a una carpeta nueva, no sobreescribas el proyecto original. No contiene `.git`, `node_modules`, `dist` ni la copia antigua. No necesitas copiar el ZIP de agentes por separado.

## 1. Crear repositorio local

Abre la carpeta extraída `BosqueVivo_HN_Repo_Limpio` en VS Code. Desde CMD o la terminal de VS Code, verifica que `package.json`, `src`, `CLAUDE.md` y los BAT estén en la raíz:

```bat
git init -b main
git add .
git status --short
git commit -m "chore: import clean BosqueVivo prototype and agent instructions"
git switch -c feature/bosquevivo-hackathon
```

Si Git pide nombre/correo, configúralos para este repositorio según tu identidad; no cambies ajustes globales sin querer. Si el directorio ya tiene `.git`, no ejecutes git init de nuevo; revisa el historial. Conserva el ZIP original como respaldo. Crear repositorio remoto nuevo en GitHub es opcional; no hace falta para empezar el trabajo local.

## 2. Preparación (una vez)

Confirma Git, Node (según Vite 8, revisar versión soportada; se recomienda Node 22.12+), npm, Python 3.11/3.12 y Claude Code CLI autenticado. Usa una VM o cuenta restringida, sin acceso a secretos personales.

```bat
preparar_bosquevivo.bat --app-deps
npm run typecheck
npm run build
```

El BAT instala dependencias de Python y Playwright locales, npm ci de la app, y consulta CMR. Lee los logs en `.bosquevivo-work/`. El build inicial debe pasar; si falla, registra el error. Si quieres el mapa real con Leaflet (recomendado, no viene instalado en el lockfile original), ejecuta **antes de iniciar Claude**:

```bat
npm install --save-exact leaflet@1.9.4
npm install --save-dev --save-exact @types/leaflet@1.9
npm run typecheck
npm run build
```

Revisa package.json y lockfile. No ejecutar instalaciones automáticas desde Claude durante la noche. Confirma también Earthdata Login antes de dejarlo trabajando; no publiques credenciales en el repositorio.

## 3. Arrancar

Lee `docs/OPERACION_NOCTURNA.md` y verifica `/permissions`, `/status`, `/agents` en Claude Code. Los permisos configurados no equivalen a un sandbox del SO; pueden existir reglas heredadas. No se promete que pueda trabajar toda la noche sin cuotas, solicitudes o bloqueos.

```bat
iniciar_bosquevivo.bat
```

O abre Claude Code en la raíz y pega `docs/PROMPT_INICIO.md`. No ejecutes los dos métodos a la vez. El BAT usa dontAsk y límite de turnos, sin bypass; no hace push ni publica. Revisa `.bosquevivo-work/claude-run.log`, `docs/PROGRESS.md` y `docs/HANDOFF.md`.

## 4. Archivos principales

- `docs/BASELINE_AUDIT.md`: revisión de la aplicación recibida, cambios concretos y alcance.
- `docs/PROGRESS_BASELINE.md`: registro de avance original.
- `CLAUDE.md`, `.claude/agents`, `docs/PLAN_MAESTRO_v4.md`, `docs/ARQUITECTURA_MODULAR.md`, `docs/CONTRATO_CIENTIFICO.md`, `docs/BACKLOG.md`: instrucciones ya integradas.
- `src/`: código existente, no una plantilla vacía.
- `scripts/`: preparación y búsqueda de metadatos CMR, no pipeline científico terminado.

## 5. Publicación

Tras validar la aplicación, `npm run build` genera `dist/`. Sube solo el contenido de `dist/` al alojamiento estático GoDaddy. No subas `.claude`, `.git`, dependencias, entornos virtuales, datos crudos, logs o secretos. Si deseas repositorio remoto, créalo vacío en GitHub y sigue sus instrucciones para agregar origin y hacer push manualmente; revisa cambios antes de publicar. Mantener sitio accesible sin login. Los datos científicos reales aún deben obtenerse y procesarse, y los usuarios de prueba son demo.

## Validación de este paquete

Se inspeccionaron los archivos y se comprobó la integridad del ZIP, la estructura, el JSON y la igualdad de los archivos fuente con la versión seleccionada. No se ejecutó npm ci/build ni los BAT de Windows; no se ha confirmado el acceso NASA, un par compatible ni los permisos efectivos de tu CLI.
