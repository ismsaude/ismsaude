import os
import re

# Fix App.jsx
app_path = '/Users/paulo/Library/Mobile Documents/com~apple~CloudDocs/Automações/ISMSAUDE/src/App.jsx'
with open(app_path, 'r') as f:
    app_content = f.read()

app_content = app_content.replace('text-slate-100', 'text-slate-800')
app_content = app_content.replace('bg-white/40 backdrop-blur-md', 'bg-white/70 backdrop-blur-md') # Make overlay much lighter

with open(app_path, 'w') as f:
    f.write(app_content)
print("Updated App.jsx overlay and root text color")

# Fix HomeHub.jsx
home_path = '/Users/paulo/Library/Mobile Documents/com~apple~CloudDocs/Automações/ISMSAUDE/src/pages/HomeHub.jsx'
with open(home_path, 'r') as f:
    home_content = f.read()

home_content = home_content.replace('text-slate-100', 'text-slate-800')
home_content = home_content.replace('text-white/50', 'text-slate-400')
home_content = home_content.replace('text-white/80', 'text-slate-500')
home_content = home_content.replace('bg-indigo-500/40', 'bg-indigo-500/20')
home_content = home_content.replace('text-indigo-200', 'text-indigo-700')
home_content = home_content.replace('text-indigo-300', 'text-indigo-600')

with open(home_path, 'w') as f:
    f.write(home_content)
print("Fixed remaining text colors in HomeHub.jsx")

