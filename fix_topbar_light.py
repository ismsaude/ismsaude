import os

topbar_path = '/Users/paulo/Library/Mobile Documents/com~apple~CloudDocs/Automações/ISMSAUDE/src/components/Topbar.jsx'
with open(topbar_path, 'r') as f:
    content = f.read()

content = content.replace('text-slate-100', 'text-slate-800')
content = content.replace('text-white', 'text-slate-800')

with open(topbar_path, 'w') as f:
    f.write(content)
