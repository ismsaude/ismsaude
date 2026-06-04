with open('src/pages/Escala.jsx', 'r') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if line.strip().startswith(')}'):
        print(f"Line {i+1}: {line.strip()}")
