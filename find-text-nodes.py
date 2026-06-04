import re
with open('src/pages/Escala.jsx', 'r') as f:
    text = f.read()

# find all instances of )} that are NOT part of an arrow function or block closing
# We look for > )} < or similar
for match in re.finditer(r'>\s*\)\}\s*<', text):
    print("Found between tags:", match.group(0))

for match in re.finditer(r'>[^<]*\)\}[^<]*<', text):
    print("Found inside tag:", match.group(0))
