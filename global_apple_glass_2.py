import os

directories = [
    '/Users/paulo/Library/Mobile Documents/com~apple~CloudDocs/Automações/ISMSAUDE/src/pages',
    '/Users/paulo/Library/Mobile Documents/com~apple~CloudDocs/Automações/ISMSAUDE/src/pages/finance',
    '/Users/paulo/Library/Mobile Documents/com~apple~CloudDocs/Automações/ISMSAUDE/src/components'
]

exclude_files = ['HomeHub.jsx', 'App.jsx', 'Topbar.jsx']

for d in directories:
    if not os.path.exists(d): continue
    for filename in os.listdir(d):
        if filename.endswith('.jsx') and filename not in exclude_files:
            file_path = os.path.join(d, filename)
            with open(file_path, 'r') as f:
                content = f.read()

            # Additional container matches
            content = content.replace('bg-white/60 border border-white/60', 'bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl')
            content = content.replace('bg-white/70 border border-white/60', 'bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl')
            
            # Modal overlays
            content = content.replace('bg-white/40 flex items-center justify-center p-4', 'bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4')
            content = content.replace('bg-white/50 flex items-center', 'bg-slate-900/40 backdrop-blur-sm flex items-center')

            # Make sure text on solid buttons is white
            content = content.replace('bg-blue-600 text-blue-700', 'bg-blue-600 text-white')
            content = content.replace('bg-blue-600 text-slate-800', 'bg-blue-600 text-white')

            with open(file_path, 'w') as f:
                f.write(content)
                
print("Second pass complete.")
