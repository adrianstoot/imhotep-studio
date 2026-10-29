from pathlib import Path
import subprocess

target = Path(__file__).resolve().parent.parent / 'public' / 'materials'
target.mkdir(parents=True, exist_ok=True)
names = ['lana_roca_real.png', 'hormigon_real.png']
for name in names:
    payload = subprocess.check_output(['git', 'show', f'HEAD:public/texturas/{name}'], cwd=target.parent.parent)
    (target / name).write_bytes(payload)
    print(name, len(payload))
