import os
import re

files_to_update = [
    '/Users/paulo/Library/Mobile Documents/com~apple~CloudDocs/Automações/ISMSAUDE/src/pages/Login.jsx',
    '/Users/paulo/Library/Mobile Documents/com~apple~CloudDocs/Automações/ISMSAUDE/src/pages/SignUp.jsx',
    '/Users/paulo/Library/Mobile Documents/com~apple~CloudDocs/Automações/ISMSAUDE/src/components/FixedScheduleModal.jsx',
    '/Users/paulo/Library/Mobile Documents/com~apple~CloudDocs/Automações/ISMSAUDE/src/components/NovoAtendimentoModal.jsx',
    '/Users/paulo/Library/Mobile Documents/com~apple~CloudDocs/Automações/ISMSAUDE/src/components/PacienteFormModal.jsx',
    '/Users/paulo/Library/Mobile Documents/com~apple~CloudDocs/Automações/ISMSAUDE/src/components/QueueSelectionModal.jsx',
    '/Users/paulo/Library/Mobile Documents/com~apple~CloudDocs/Automações/ISMSAUDE/src/components/SigtapAutocomplete.jsx',
    '/Users/paulo/Library/Mobile Documents/com~apple~CloudDocs/Automações/ISMSAUDE/src/components/UnitPrompt.jsx'
]

for file_path in files_to_update:
    if os.path.exists(file_path):
        with open(file_path, 'r') as f:
            content = f.read()

        # Base replacements
        content = content.replace('bg-[#f8fafc]', 'bg-transparent')
        content = content.replace('bg-slate-50/50', 'bg-white/5')
        content = content.replace('border-slate-200/80', 'border-white/10')
        content = content.replace('border-slate-200/60', 'border-white/10')
        content = content.replace('bg-white/30', 'bg-white/5')
        content = content.replace('bg-white/70', 'bg-white/5')
        content = content.replace('bg-white/60', 'bg-white/5')
        content = content.replace('bg-white/50', 'bg-white/5')
        content = content.replace('bg-white/40', 'bg-white/5')

        # Regex with negative lookahead
        content = re.sub(r'\bbg-white(?![/\w])', 'bg-white/5', content)
        content = re.sub(r'\bbg-slate-50(?![/\w])', 'bg-white/5', content)
        content = re.sub(r'\bbg-slate-100(?![/\w])', 'bg-white/10', content)
        content = re.sub(r'\bbg-slate-200(?![/\w])', 'bg-white/20', content)
        content = re.sub(r'\bbg-slate-800(?![/\w])', 'bg-black/40', content)
        content = re.sub(r'\bbg-slate-900(?![/\w])', 'bg-black/60', content)

        content = re.sub(r'\btext-slate-900(?![/\w])', 'text-white', content)
        content = re.sub(r'\btext-slate-800(?![/\w])', 'text-white drop-shadow-sm', content)
        content = re.sub(r'\btext-slate-700(?![/\w])', 'text-slate-200', content)
        content = re.sub(r'\btext-slate-600(?![/\w])', 'text-slate-300', content)
        content = re.sub(r'\btext-slate-500(?![/\w])', 'text-slate-400', content)
        content = re.sub(r'\btext-slate-400(?![/\w])', 'text-slate-500', content)

        content = re.sub(r'\bborder-slate-300(?![/\w])', 'border-white/20', content)
        content = re.sub(r'\bborder-slate-200(?![/\w])', 'border-white/10', content)
        content = re.sub(r'\bborder-slate-100(?![/\w])', 'border-white/5', content)

        # specific tweaks for modals and main containers to add blur
        content = content.replace('bg-slate-900/40', 'bg-black/60 backdrop-blur-sm')
        content = content.replace('bg-slate-900/50', 'bg-black/60 backdrop-blur-sm')
        content = content.replace('rounded-3xl shadow-2xl', 'rounded-3xl shadow-2xl backdrop-blur-xl')
        content = content.replace('rounded-2xl shadow-2xl', 'rounded-2xl shadow-2xl backdrop-blur-xl')
        content = content.replace('rounded-xl p-1.5 shadow-sm', 'rounded-xl p-1.5 shadow-sm backdrop-blur-md')
        content = content.replace('rounded-2xl shadow-sm', 'rounded-2xl shadow-sm backdrop-blur-md')
        content = content.replace('rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)]', 'rounded-2xl shadow-lg shadow-black/20 backdrop-blur-md')
        content = content.replace('shadow-slate-200/40', 'shadow-black/20')

        # Fix inputs placeholder text
        content = content.replace('placeholder:text-slate-400', 'placeholder:text-slate-500')
        
        # Also fix some common UI elements
        content = content.replace('bg-indigo-50/50', 'bg-indigo-500/10')
        content = content.replace('bg-indigo-50', 'bg-indigo-500/20')
        content = content.replace('bg-emerald-50', 'bg-emerald-500/20')
        content = content.replace('bg-rose-50', 'bg-rose-500/20')
        content = content.replace('bg-blue-50', 'bg-blue-500/20')
        content = content.replace('bg-amber-50', 'bg-amber-500/20')

        with open(file_path, 'w') as f:
            f.write(content)
        print(f"{os.path.basename(file_path)} updated!")
