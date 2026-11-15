#!/usr/bin/env python3
"""Sequential Claude -> Codex handoff. Run from FOREST_SAR_HN root.
No installation, push, deployment, API billing opt-in, or sandbox escalation.
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path.cwd().resolve()
WORK = ROOT / '.bosquevivo-work'
LOCK = WORK / 'relevo.lock'
STATUS = re.compile(r'^FOREST_HANDOFF_STATUS:\s*(COMPLETE|PENDING|BLOCKED)\s*$', re.M)
QUOTA = re.compile(r'\b(?:rate[_ -]?limit(?:ed|_error)?|usage limit|quota exceeded|out of extra usage|hit your limit|limit reached|usage cap|too many requests|error_max_turns|max(?:imum)?[ -]turns reached|429)\b', re.I)
AUTH = re.compile(r'\b(?:not logged in|not authenticated|authentication failed|invalid api key|unauthorized|login required|invalid credentials|authentication_error)\b', re.I)
MARKER = '''\n\n## Contrato adicional de relevo automático
Este lanzador ejecutará Codex una sola vez después de ti si queda trabajo autorizado. Actualiza PROGRESS después de cada lote y HANDOFF antes de finalizar, con próximo paso concreto. No inicies Codex ni otra sesión externa. No uses servicios de pago adicionales. Termina tu respuesta final con exactamente una línea sin formato: FOREST_HANDOFF_STATUS: COMPLETE si todo P0 requerido está implementado y comprobado; FOREST_HANDOFF_STATUS: PENDING si quedan tareas autorizadas realizables; FOREST_HANDOFF_STATUS: BLOCKED si únicamente quedan permisos, credenciales, red u otras dependencias que requieren intervención humana. No declares COMPLETE si faltan resultados científicos requeridos. Un código de salida cero no significa que el trabajo se terminó.\n'''


def now():
    return datetime.now(timezone.utc).isoformat(timespec='seconds')


def safe_path(path):
    if not path.resolve().is_relative_to(ROOT):
        raise RuntimeError(f'Ruta fuera del proyecto: {path.name}')
    return path


def refresh_path():
    if os.name != 'nt':
        return
    import winreg
    paths = [os.environ.get('PATH', '')]
    for hive, key in ((winreg.HKEY_LOCAL_MACHINE, r'SYSTEM\CurrentControlSet\Control\Session Manager\Environment'), (winreg.HKEY_CURRENT_USER, 'Environment')):
        try:
            with winreg.OpenKey(hive, key) as k:
                value, _ = winreg.QueryValueEx(k, 'Path')
            paths.append(os.path.expandvars(value))
        except OSError:
            pass
    os.environ['PATH'] = os.pathsep.join(dict.fromkeys(p for part in paths for p in part.split(os.pathsep) if p))


def command(exe, args):
    # npm's Windows .cmd shim must run via cmd.exe. Arguments are fixed literals;
    # prompts are sent on stdin, never interpolated into a shell command.
    if os.name == 'nt' and Path(exe).suffix.lower() in ('.cmd', '.bat'):
        if any(c in exe for c in '%!&|<>^\r\n'):
            raise RuntimeError('Ruta de CLI incompatible con el lanzador .cmd')
        line = subprocess.list2cmdline([exe, *args])
        return f'"{os.environ.get("COMSPEC", "cmd.exe")}" /d /s /c "{line}"'
    return [exe, *args]


def cli(name):
    exe = shutil.which(name)
    if not exe:
        raise RuntimeError(f'No se encuentra {name}. Instala o restaura PATH antes de iniciar.')
    return exe


def inspect_git(git, *args):
    r = subprocess.run(command(git, list(args)), cwd=ROOT, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=30)
    if r.returncode:
        raise RuntimeError('No se pudo inspeccionar Git; no se inicia el desarrollo.')
    return r.stdout.strip()


def result_claude(stdout, stderr, code):
    """Return (action, reason). Only use the terminal result, not tool chatter."""
    try:
        obj = json.loads(stdout)
    except (ValueError, TypeError):
        obj = None
    if not isinstance(obj, dict):
        obj = {}
    result = obj.get('result', '')
    result = result if isinstance(result, str) else ''
    subtype = str(obj.get('subtype', ''))
    errors = obj.get('errors', [])
    error_text = subtype + '\n' + str(errors) + '\n' + result + '\n' + stderr[-12000:]
    if AUTH.search(error_text) and (code != 0 or obj.get('is_error') or not result):
        return 'stop', 'claude_authentication_error'
    # Recognized quota/max-turn failures can have exit code zero.
    if subtype == 'error_max_turns' or ((code != 0 or obj.get('is_error')) and QUOTA.search(error_text)):
        return 'codex', 'claude_quota_or_turn_limit'
    if code != 0 or obj.get('is_error') or subtype.startswith('error'):
        return 'stop', 'claude_unclassified_error_review_required'
    if not obj:
        if QUOTA.search(stdout[-12000:] + '\n' + stderr[-12000:]):
            return 'codex', 'claude_quota_text'
        return 'stop', 'claude_missing_structured_result_review_required'
    # Some versions report a usage limit as plain final text with exit code 0.
    if re.match(r'^\s*(?:you(?:\s+have|\x27ve)?\s+(?:hit|reached)|rate limit|usage limit|quota exceeded|out of extra usage|error:\s*429)', result, re.I):
        return 'codex', 'claude_quota_text'
    matches = STATUS.findall(result)
    if len(matches) == 1 and matches[0] == 'COMPLETE':
        return 'stop', 'claude_reports_complete_review_evidence'
    if len(matches) == 1 and matches[0] == 'BLOCKED':
        return 'stop', 'claude_reports_external_blocker'
    if len(matches) == 1 and matches[0] == 'PENDING':
        return 'codex', 'claude_reports_pending'
    # A normal successful result without a status is not proof of completion.
    return 'codex', 'claude_completion_unconfirmed'


def codex_result(stdout, code):
    msgs, completed, failed = [], False, False
    for line in stdout.splitlines():
        try:
            ev = json.loads(line)
        except ValueError:
            continue
        if not isinstance(ev, dict):
            continue
        if ev.get('type') == 'turn.completed': completed = True
        if ev.get('type') == 'turn.failed': failed = True
        item = ev.get('item') or {}
        if ev.get('type') == 'item.completed' and item.get('type') == 'agent_message':
            msgs.append(str(item.get('text', '')))
    matches = STATUS.findall(msgs[-1]) if msgs else []
    if code or failed or not completed:
        return 'codex_error_review_log'
    if len(matches) == 1:
        return 'codex_reports_' + matches[0].lower()
    return 'codex_finished_unconfirmed_review_evidence'


def read_tail(path, limit=2_000_000):
    with path.open('rb') as f:
        f.seek(max(0, path.stat().st_size - limit))
        return f.read().decode('utf-8', errors='replace')


def run_agent(name, exe, args, prompt, env, run_dir, timeout):
    out = run_dir / (name + '-run.log')
    err = run_dir / (name + '-stderr.log')
    print(f'{name}: iniciado. Registro: {out.relative_to(ROOT)}', flush=True)
    with out.open('wb') as stdout, err.open('wb') as stderr:
        r = subprocess.run(command(exe, args), cwd=ROOT, input=prompt.encode('utf-8'), stdout=stdout, stderr=stderr, env=env, timeout=timeout)
    print(f'{name}: proceso finalizado, codigo {r.returncode}.', flush=True)
    return r.returncode, read_tail(out), read_tail(err)


def main():
    ap = argparse.ArgumentParser(description='Relevo secuencial Claude -> Codex')
    ap.add_argument('--codex-only', action='store_true', help='Retomar trabajo existente con Codex sin lanzar Claude. Confirmar antes que Claude se detuvo.')
    ap.add_argument('--check', action='store_true', help='Solo comprobar requisitos locales, sin iniciar agentes.')
    ap.add_argument('--allow-api-billing', action='store_true', help='Permitir claves API heredadas; puede generar cargos externos.')
    ap.add_argument('--claude-minutes', type=int, default=120)
    ap.add_argument('--codex-minutes', type=int, default=90)
    a = ap.parse_args()
    if min(a.claude_minutes, a.codex_minutes) < 1:
        raise RuntimeError('Los limites de tiempo deben ser positivos.')
    refresh_path()
    for name in ['.git', 'package.json', 'CLAUDE.md', 'docs/PROMPT_INICIO.md', 'docs/PLAN_MAESTRO_v4.md', 'docs/CONTRATO_CIENTIFICO.md', 'docs/ARQUITECTURA_MODULAR.md', '.claude/bosquevivo-session.json', 'CODEX_RELEVO.md']:
        if not safe_path(ROOT / name).exists():
            raise RuntimeError(f'Falta {name}; ejecuta desde la raiz del proyecto v5.')
    git = cli('git')
    branch = inspect_git(git, 'branch', '--show-current')
    if not branch or branch.lower() in ('main', 'master'):
        raise RuntimeError('Se requiere una rama de desarrollo distinta de main/master.')
    claude = None if a.codex_only else cli('claude')
    codex = cli('codex')
    if not a.allow_api_billing and any(os.environ.get(k) for k in ('ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'CODEX_API_KEY', 'ANTHROPIC_AUTH_TOKEN')):
        raise RuntimeError('Hay credenciales API en el entorno. Usa sesiones de suscripcion o autoriza expresamente --allow-api-billing.')
    if not a.codex_only and not os.environ.get('EARTHDATA_TOKEN'):
        raise RuntimeError('Falta EARTHDATA_TOKEN en esta terminal. Configuralo antes de iniciar Claude.')
    if os.name == 'nt' and not (ROOT / '.venv/Scripts/python.exe').is_file():
        raise RuntimeError('No se encuentra el Python virtual del proyecto.')
    if not (ROOT / '.bosquevivo-tools/node_modules/@playwright/test/cli.js').is_file():
        print('Aviso: Playwright no disponible; no bloquea este lanzamiento.', flush=True)
    print(f'Rama: {branch}. CLIs encontrados. Earthdata: {"presente" if os.environ.get("EARTHDATA_TOKEN") else "ausente"}.', flush=True)
    if a.check:
        print('Preflight OK. No se iniciaron agentes. Comprueba sus sesiones de login por separado.')
        return 0
    safe_path(WORK).mkdir(exist_ok=True)
    safe_path(LOCK)
    try:
        fd = os.open(LOCK, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError:
        raise RuntimeError('Ya existe relevo.lock. No inicies otro agente. Si es de un fallo anterior, verifica procesos y revisa estado antes de retirarlo.')
    with os.fdopen(fd, 'w') as f:
        f.write(f'pid={os.getpid()} started={now()}\n')
    release = False
    run_dir = safe_path(WORK / ('relevo-' + datetime.now().strftime('%Y%m%d-%H%M%S-%f')))
    run_dir.mkdir()
    state_path = run_dir / 'estado.json'
    state = {'started_utc': now(), 'branch': branch, 'phase': 'preflight', 'runs': [], 'reason': None}
    def save(phase, reason=None):
        state.update(phase=phase, reason=reason, updated_utc=now())
        temp = state_path.with_suffix('.tmp')
        temp.write_text(json.dumps(state, indent=2, ensure_ascii=False)+'\n', encoding='utf-8')
        os.replace(temp, state_path)
        print(f'Estado: {phase} | {reason or "-"}', flush=True)
    try:
        env = os.environ.copy()
        env['PLAYWRIGHT_BROWSERS_PATH'] = str(ROOT / '.bosquevivo-tools/browsers')
        reason = 'manual_resume'
        if not a.codex_only:
            save('claude_running')
            prompt = (ROOT / 'docs/PROMPT_INICIO.md').read_text(encoding='utf-8-sig') + MARKER
            args = ['-p', '--model', 'claude-opus-5-5', '--effort', 'medium', '--permission-mode', 'dontAsk', '--settings', '.claude/bosquevivo-session.json', '--max-turns', '70', '--output-format', 'json']
            code, out, err = run_agent('claude', claude, args, prompt, env, run_dir, a.claude_minutes*60)
            action, reason = result_claude(out, err, code)
            state['runs'].append({'agent':'claude','exit_code':code,'classification':reason})
            save('claude_stopped', reason)
            if action != 'codex':
                save('finished_review_required', reason)
                release = True
                return 0 if reason.startswith('claude_reports_') else 1
        if inspect_git(git, 'branch', '--show-current') != branch:
            save('stopped', 'branch_changed_review_required')
            release = True
            return 1
        # No data from provider logs is injected into the next prompt. Only a fixed reason.
        prompt = (ROOT / 'CODEX_RELEVO.md').read_text(encoding='utf-8-sig') + f'\n\nMotivo del relevo registrado por el lanzador: {reason}. Revisa el estado real antes de editar.\n'
        cenv = env.copy()
        for key in ('EARTHDATA_TOKEN', 'EARTHDATA_USERNAME', 'EARTHDATA_PASSWORD', 'ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN'):
            cenv.pop(key, None)
        save('codex_running', reason)
        # TOML string settings use unquoted CLI values; Codex parses raw strings if needed.
        args = ['exec', '--sandbox', 'workspace-write', '-c', 'approval_policy=never', '-c', 'sandbox_workspace_write.network_access=false', '-c', 'model_reasoning_effort=medium', '--color', 'never', '--json', '-']
        code, out, err = run_agent('codex', codex, args, prompt, cenv, run_dir, a.codex_minutes*60)
        result = codex_result(out, code)
        state['runs'].append({'agent':'codex','exit_code':code,'classification':result})
        save('finished_review_required', result)
        release = True
        return 0 if result.startswith('codex_reports_') else 1
    except (KeyboardInterrupt, subprocess.TimeoutExpired):
        # Child or descendant may still be alive on Windows. Never start a replacement.
        save('interrupted_review_required', 'timeout_or_user_interrupt_check_processes')
        print('Interrumpido. Se conserva el bloqueo: verifica que no queden procesos de agentes antes de retirarlo.', flush=True)
        return 130
    except Exception:
        save('error_review_required', 'unexpected_launcher_error_check_processes')
        raise
    finally:
        if release:
            LOCK.unlink(missing_ok=True)
        print(f'Estado guardado en: {state_path.relative_to(ROOT)}', flush=True)


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (RuntimeError, OSError, ValueError) as e:
        print('ERROR:', e, file=sys.stderr)
        sys.exit(1)
