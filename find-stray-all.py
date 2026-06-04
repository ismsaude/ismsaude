import os
import re

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.jsx'):
            with open(os.path.join(root, file), 'r') as f:
                content = f.read()
                
            # Look for closing brace followed by space and then JSX text
            for i, line in enumerate(content.split('\n')):
                if ">)}" in line.replace(" ", "") or ")}<" in line.replace(" ", ""):
                    # Ignore normal matches
                    if "<option" in line: continue
                    print(f"{file}:{i+1}: {line.strip()}")
