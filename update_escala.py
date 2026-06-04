import re

file_path = '/Users/paulo/Library/Mobile Documents/com~apple~CloudDocs/Automações/ISMSAUDE/src/pages/Escala.jsx'

with open(file_path, 'r') as f:
    content = f.read()

# Base replacements
content = content.replace('bg-[#f8fafc]', 'bg-transparent')
content = content.replace('bg-slate-50/50', 'bg-white/5')
content = content.replace('border-slate-200/80', 'border-white/10')
content = content.replace('border-slate-200/60', 'border-white/10')
content = content.replace('bg-white/30', 'bg-white/5')

# Regex with negative lookahead
content = re.sub(r'\bbg-white(?![/\w])', 'bg-white/5', content)
content = re.sub(r'\bbg-slate-50(?![/\w])', 'bg-white/5', content)
content = re.sub(r'\bbg-slate-100(?![/\w])', 'bg-white/10', content)
content = re.sub(r'\bbg-slate-200(?![/\w])', 'bg-white/20', content)

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
content = content.replace('rounded-3xl shadow-2xl', 'rounded-3xl shadow-2xl backdrop-blur-xl')
content = content.replace('rounded-2xl shadow-2xl', 'rounded-2xl shadow-2xl backdrop-blur-xl')
content = content.replace('rounded-xl p-1.5 shadow-sm', 'rounded-xl p-1.5 shadow-sm backdrop-blur-md')
content = content.replace('rounded-2xl shadow-sm', 'rounded-2xl shadow-sm backdrop-blur-md')
content = content.replace('rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)]', 'rounded-2xl shadow-lg shadow-black/20 backdrop-blur-md')

# Fix inputs placeholder text
content = content.replace('placeholder:text-slate-400', 'placeholder:text-slate-500')

with open(file_path, 'w') as f:
    f.write(content)

print("Escala.jsx updated!")
