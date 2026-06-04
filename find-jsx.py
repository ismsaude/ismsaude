import re
with open('src/pages/Escala.jsx', 'r') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if ">)}" in line.replace(" ", "") or ")}<" in line.replace(" ", ""):
        print(f"Line {i+1}: {line.strip()}")
