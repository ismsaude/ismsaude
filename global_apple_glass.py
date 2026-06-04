import os
import re

directories = [
    '/Users/paulo/Library/Mobile Documents/com~apple~CloudDocs/Automações/ISMSAUDE/src/pages',
    '/Users/paulo/Library/Mobile Documents/com~apple~CloudDocs/Automações/ISMSAUDE/src/components'
]

# Specifically exclude HomeHub since it is already Apple Glass
exclude_files = ['HomeHub.jsx', 'App.jsx', 'Topbar.jsx']

for d in directories:
    for filename in os.listdir(d):
        if filename.endswith('.jsx') and filename not in exclude_files:
            file_path = os.path.join(d, filename)
            with open(file_path, 'r') as f:
                content = f.read()

            # 1. Elevate Containers (Cards/Modals)
            # Find the standard light glass backgrounds and upgrade their borders/shadows
            content = content.replace('bg-white/60 backdrop-blur-md border border-white/60', 'bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl')
            content = content.replace('bg-white/80 backdrop-blur-md border border-white/80', 'bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl')
            content = content.replace('bg-white/70 backdrop-blur-xl border border-white/80', 'bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl')
            content = content.replace('bg-white/70 border border-white/60', 'bg-white/80 border-2 border-white shadow-sm')
            
            # Hover effects for cards
            content = content.replace('hover:shadow-[0_0_30px_rgba(255,255,255,0.05)]', 'hover:shadow-[0_15px_30px_rgba(0,0,0,0.1)]')
            content = content.replace('hover:border-white/80', 'hover:border-white hover:bg-white/90')

            # 2. Solid Primary Buttons
            # Blue
            content = content.replace('bg-blue-500/20 text-blue-700', 'bg-blue-600 text-white shadow-[0_4px_15px_rgba(59,130,246,0.4)] border-none')
            content = content.replace('bg-blue-500/20 text-blue-600', 'bg-blue-600 text-white shadow-[0_4px_15px_rgba(59,130,246,0.4)] border-none')
            content = content.replace('hover:bg-blue-500/30', 'hover:bg-blue-700 hover:shadow-[0_6px_20px_rgba(59,130,246,0.5)]')
            
            # Indigo
            content = content.replace('bg-indigo-500/20 text-indigo-700', 'bg-indigo-600 text-white shadow-[0_4px_15px_rgba(79,70,229,0.4)] border-none')
            content = content.replace('hover:bg-indigo-500/30', 'hover:bg-indigo-700 hover:shadow-[0_6px_20px_rgba(79,70,229,0.5)]')

            # Emerald (Green)
            content = content.replace('bg-emerald-500/20 text-emerald-700', 'bg-emerald-500 text-white shadow-[0_4px_15px_rgba(16,185,129,0.4)] border-none')
            content = content.replace('hover:bg-emerald-500/30', 'hover:bg-emerald-600 hover:shadow-[0_6px_20px_rgba(16,185,129,0.5)]')
            
            # Rose (Red)
            content = content.replace('bg-rose-500/20 text-rose-700', 'bg-rose-500 text-white shadow-[0_4px_15px_rgba(244,63,94,0.4)] border-none')
            content = content.replace('hover:bg-rose-500/30', 'hover:bg-rose-600 hover:shadow-[0_6px_20px_rgba(244,63,94,0.5)]')

            # 3. Clean up modal overlays (they should remain dark enough or be very light)
            # Usually modal backgrounds were 'bg-white/40' from our light glass update. Let's make them 'bg-slate-900/40 backdrop-blur-sm'
            content = content.replace('bg-white/40 backdrop-blur-md z-50', 'bg-slate-900/40 backdrop-blur-sm z-50')
            content = content.replace('bg-white/40 backdrop-blur-sm z-[100]', 'bg-slate-900/40 backdrop-blur-sm z-[100]')
            
            with open(file_path, 'w') as f:
                f.write(content)
            
print("Global Apple Glass applied.")
