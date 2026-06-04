import os

files_to_fix = [
    '/Users/paulo/Library/Mobile Documents/com~apple~CloudDocs/Automações/ISMSAUDE/src/components/Sidebar.jsx',
    '/Users/paulo/Library/Mobile Documents/com~apple~CloudDocs/Automações/ISMSAUDE/src/components/Topbar.jsx',
    '/Users/paulo/Library/Mobile Documents/com~apple~CloudDocs/Automações/ISMSAUDE/src/pages/Settings.jsx',
    '/Users/paulo/Library/Mobile Documents/com~apple~CloudDocs/Automações/ISMSAUDE/src/pages/Escala.jsx'
]

for file_path in files_to_fix:
    with open(file_path, 'r') as f:
        content = f.read()
        
    content = content.replace('bg-slate-800 text-slate-800', 'bg-slate-800 text-white')
    content = content.replace('bg-slate-900 text-slate-800', 'bg-slate-900 text-white')
    
    with open(file_path, 'w') as f:
        f.write(content)
        
print("Fixed legible text")
