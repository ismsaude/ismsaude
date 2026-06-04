import re

file_path = '/Users/paulo/Library/Mobile Documents/com~apple~CloudDocs/Automações/ISMSAUDE/src/pages/Settings.jsx'

with open(file_path, 'r') as f:
    content = f.read()

# First replace specific fractions to avoid double replacement
content = content.replace('bg-white/70', 'bg-white/5')
content = content.replace('bg-white/60', 'bg-white/5')
content = content.replace('bg-white/50', 'bg-white/5')
content = content.replace('bg-white/40', 'bg-white/5')
content = content.replace('bg-white/30', 'bg-white/5')
content = content.replace('bg-slate-50/50', 'bg-transparent')
content = content.replace('border-white/50', 'border-white/10')
content = content.replace('border-white/60', 'border-white/10')
content = content.replace('shadow-slate-200/40', 'shadow-black/20')

# Then replace the base colors using regex with negative lookahead to avoid breaking already fractional classes
content = re.sub(r'\bbg-white(?![/\w])', 'bg-white/5', content)
content = re.sub(r'\bbg-slate-50(?![/\w])', 'bg-white/5', content)
content = re.sub(r'\bbg-slate-100(?![/\w])', 'bg-white/10', content)

content = re.sub(r'\btext-slate-800(?![/\w])', 'text-white', content)
content = re.sub(r'\btext-slate-700(?![/\w])', 'text-slate-200', content)
content = re.sub(r'\btext-slate-600(?![/\w])', 'text-slate-300', content)
content = re.sub(r'\btext-slate-500(?![/\w])', 'text-slate-400', content)
content = re.sub(r'\btext-slate-400(?![/\w])', 'text-slate-500', content)

content = re.sub(r'\bborder-slate-300(?![/\w])', 'border-white/20', content)
content = re.sub(r'\bborder-slate-200(?![/\w])', 'border-white/10', content)
content = re.sub(r'\bborder-slate-100(?![/\w])', 'border-white/5', content)

# Clean up input text colors to make sure inputs are readable
content = content.replace('text-white outline-none', 'text-slate-100 outline-none')
content = content.replace('placeholder:text-slate-400', 'placeholder:text-slate-500')

with open(file_path, 'w') as f:
    f.write(content)

print("Settings.jsx updated successfully!")
