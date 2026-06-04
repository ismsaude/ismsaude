import os
import re

directories = [
    '/Users/paulo/Library/Mobile Documents/com~apple~CloudDocs/Automações/ISMSAUDE/src/pages',
    '/Users/paulo/Library/Mobile Documents/com~apple~CloudDocs/Automações/ISMSAUDE/src/components'
]

# Specifically handle App.jsx global overlay
app_path = '/Users/paulo/Library/Mobile Documents/com~apple~CloudDocs/Automações/ISMSAUDE/src/App.jsx'
with open(app_path, 'r') as f:
    app_content = f.read()

app_content = app_content.replace('bg-slate-900/80 backdrop-blur-md', 'bg-white/40 backdrop-blur-md')
with open(app_path, 'w') as f:
    f.write(app_content)
print("Updated App.jsx overlay")


# Iterate over all components
for d in directories:
    for filename in os.listdir(d):
        if filename.endswith('.jsx'):
            file_path = os.path.join(d, filename)
            with open(file_path, 'r') as f:
                content = f.read()

            # Backgrounds
            content = content.replace('bg-white/5 ', 'bg-white/60 ')
            content = content.replace('bg-white/5"', 'bg-white/60"')
            content = content.replace('bg-white/5`', 'bg-white/60`')
            
            content = content.replace('bg-white/10', 'bg-white/70')
            content = content.replace('bg-white/20', 'bg-white/80')
            
            content = content.replace('bg-black/40', 'bg-white/50')
            content = content.replace('bg-black/60', 'bg-white/40') # specifically for modals overlays

            # Texts
            content = content.replace('text-white drop-shadow-sm', 'text-slate-900 drop-shadow-none')
            content = re.sub(r'\btext-white(?![/\w])', 'text-slate-800', content)
            
            content = re.sub(r'\btext-slate-200(?![/\w])', 'text-slate-700', content)
            content = re.sub(r'\btext-slate-300(?![/\w])', 'text-slate-600', content)
            content = re.sub(r'\btext-slate-400(?![/\w])', 'text-slate-500', content)
            
            # Note: I won't change text-slate-500 that was formerly 400 because it gets complex. 
            # 500 looks okay on white glass.
            
            # Borders
            content = content.replace('border-white/5', 'border-white/40')
            content = content.replace('border-white/10', 'border-white/60')
            content = content.replace('border-white/20', 'border-white/80')
            
            # Shadows
            content = content.replace('shadow-black/20', 'shadow-slate-300/40')

            with open(file_path, 'w') as f:
                f.write(content)
            print(f"Converted {filename}")

