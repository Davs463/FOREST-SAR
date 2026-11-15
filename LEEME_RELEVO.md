# Relevo inteligente FOREST_SAR_HN

Extrae los archivos directamente en la raíz existente del proyecto, junto a CLAUDE.md y package.json. No reemplaza la actualización v5 ni el BAT anterior. Usa este lanzador EN LUGAR del BAT para una ejecución con respaldo. No lo ejecutes simultáneamente con Claude o Codex desde otras terminales o extensiones.

## Antes de iniciar (PowerShell)

1. Si falta Codex CLI: `npm.cmd install -g @openai/codex`.
2. Verifica `codex --version` y `codex login status`; si falta sesión, `codex login` y elige ChatGPT. Verifica también `claude --version` y `claude auth status`. Si la terminal no encuentra Claude o Codex, refresca PATH:
   `$env:Path = $env:Path + ';' + [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')`
3. En esta misma terminal, comprueba EARTHDATA_TOKEN: `if ($env:EARTHDATA_TOKEN) { 'Earthdata listo' } else { 'Falta token' }`. Si falta, configúralo con Read-Host -AsSecureString como antes; no lo pegues en el código, un prompt o el chat.
4. Preflight: `.\.venv\Scripts\python.exe .\iniciar_relevo.py --check`. Verifica rutas, rama, CLIs y presencia del token, no las cuotas ni la sesión de cada proveedor.
5. Inicio: `.\.venv\Scripts\python.exe .\iniciar_relevo.py`.

Si Claude ya trabajó y terminó, puedes saltar directamente al relevo: `.\.venv\Scripts\python.exe .\iniciar_relevo.py --codex-only`. No requiere Earthdata en ese modo.

## Comportamiento

- Claude: prompt v5, Opus 5.5, esfuerzo medio, permisos dontAsk, máximo 70 turnos; sus subagentes v5 siguen intactos. Si la versión/modelo no está disponible, el lanzador registra error; no cambia silenciosamente el modelo.
- Codex: un único proceso `codex exec` con modelo configurado en tu CLI, esfuerzo medio, sandbox workspace-write, aprobación never y red restringida. Usa CODEX_RELEVO.md y los archivos existentes. No recibe EARTHDATA_TOKEN: puede usar datos locales, no nuevas descargas autenticadas. No cambia automáticamente la configuración del usuario.
- Ante límite de uso reconocido, máximo de turnos, estado PENDING o resultado normal sin declaración de completitud, intenta relevar a Codex. Ante COMPLETE, BLOCKED, error desconocido o autenticación, para para revisión. No garantiza reconocer todos los formatos futuros de error. Nunca activa otro proveedor para saltarse restricciones.
- Por defecto 120 minutos para Claude y 90 para Codex, con `--claude-minutes` y `--codex-minutes` ajustables. Si un proceso se interrumpe o excede el tiempo, se detiene el lanzador sin iniciar otro agente y conserva el bloqueo: un proceso descendiente podría seguir vivo. Comprueba procesos antes de retirar `.bosquevivo-work/relevo.lock` manualmente.
- Solo un relevo automático. Sin bucle Claude-Codex-Claude, sin compras automáticas, no instala dependencias, no hace commits ni despliegues. Si detecta variables de credenciales API, se detiene salvo autorización explícita `--allow-api-billing`. Esto no detecta todos los proveedores de pago configurados en disco; revisa ambas cuentas. Los tiempos/turnos no son presupuestos de tokens o dinero.
- El lock solo impide duplicados de este lanzador, no sesiones que abras manualmente. No edites con extensiones durante la ejecución. Claude dontAsk no constituye aislamiento del sistema; Codex tiene sandbox diferente. No se desactiva la seguridad. Para aislamiento fuerte, utiliza una VM/usuario dedicado.

## Registros y revisión

Cada ejecución crea `.bosquevivo-work/relevo-<fecha>/` con `estado.json`, `claude-run.log`, `claude-stderr.log`, `codex-run.log` y `codex-stderr.log` (solo para agentes iniciados). No sobreescribe registros previos. La salida Claude JSON puede aparecer al final, Codex emite eventos JSONL. No publiques estos logs: pueden incluir contexto del repositorio. Revisa `docs/PROGRESS.md`, `docs/HANDOFF.md`, `git diff --stat`, resultados científicos y pruebas. COMPLETE es una declaración del agente, no garantía independiente de calidad.

Pruebas del lanzador: lógica y flujo con CLIs simulados, no autenticación real ni ejecución de agentes en Windows. La primera ejecución debe comprobarse en tu equipo. Si la configuración de Codex no admite el sandbox de Windows, realiza su configuración interactiva oficial antes de reintentar; no uses bypass.
