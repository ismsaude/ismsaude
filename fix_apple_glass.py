import re

# Topbar - Remove brightness-0 invert from the logo
topbar_path = '/Users/paulo/Library/Mobile Documents/com~apple~CloudDocs/Automações/ISMSAUDE/src/components/Topbar.jsx'
with open(topbar_path, 'r') as f:
    topbar_content = f.read()

topbar_content = topbar_content.replace('brightness-0 invert ', '')

with open(topbar_path, 'w') as f:
    f.write(topbar_content)

# HomeHub.jsx - Apple Glass Refinements
home_path = '/Users/paulo/Library/Mobile Documents/com~apple~CloudDocs/Automações/ISMSAUDE/src/pages/HomeHub.jsx'
with open(home_path, 'r') as f:
    home_content = f.read()

# 1. Vibrant Gradients for the Modules
gradients = {
    'atendimento': "darkIconColor = 'text-white'; darkIconBg = 'bg-gradient-to-br from-emerald-400 to-teal-500 shadow-md shadow-emerald-500/30';",
    'mapa': "darkIconColor = 'text-white'; darkIconBg = 'bg-gradient-to-br from-blue-400 to-indigo-500 shadow-md shadow-blue-500/30';",
    'pep': "darkIconColor = 'text-white'; darkIconBg = 'bg-gradient-to-br from-indigo-400 to-purple-500 shadow-md shadow-indigo-500/30';",
    'financeiro': "darkIconColor = 'text-white'; darkIconBg = 'bg-gradient-to-br from-violet-400 to-fuchsia-500 shadow-md shadow-violet-500/30';",
    'escala': "darkIconColor = 'text-white'; darkIconBg = 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-md shadow-amber-500/30';",
    'relatorios': "darkIconColor = 'text-white'; darkIconBg = 'bg-gradient-to-br from-rose-400 to-pink-500 shadow-md shadow-rose-500/30';",
    'configuracoes': "darkIconColor = 'text-white'; darkIconBg = 'bg-gradient-to-br from-slate-400 to-slate-500 shadow-md shadow-slate-500/30';"
}

for mod, replacement in gradients.items():
    # Example to match: if (mod.id === 'atendimento') { darkIconColor = 'text-emerald-400'; darkIconBg = 'bg-emerald-400/20'; }
    home_content = re.sub(rf"if \(mod.id === '{mod}'\) {{.*?}}", f"if (mod.id === '{mod}') {{ {replacement} }}", home_content)

# 2. Card Styles (Crisp borders, better shadows)
home_content = home_content.replace(
    "'bg-white/70 backdrop-blur-xl border border-white/80 shadow-2xl hover:bg-white/80 hover:-translate-y-2 hover:border-white/40 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]'",
    "'bg-white/70 backdrop-blur-xl border-2 border-white shadow-xl hover:bg-white/90 hover:-translate-y-1 hover:shadow-[0_15px_30px_rgba(0,0,0,0.1)]'"
)

# 3. Support Card Avatars (increase size)
home_content = home_content.replace('w-12 h-12 rounded-full', 'w-14 h-14 rounded-full')
home_content = home_content.replace('w-12 h-12 bg-gradient-to-tr', 'w-14 h-14 bg-gradient-to-tr')

# 4. Empty State Calendar
home_content = home_content.replace(
    '<div className="w-16 h-16 bg-white/60 rounded-full flex items-center justify-center mb-3">',
    '<div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-blue-50 rounded-full border border-white flex items-center justify-center mb-3 shadow-inner">'
)
home_content = home_content.replace(
    '<CalendarRange size={28} className="text-slate-500"/>',
    '<CalendarRange size={32} className="text-indigo-400 drop-shadow-sm"/>'
)

# 5. "Ver Escala Completa" Button
home_content = home_content.replace(
    "className=\"w-full py-3 bg-indigo-500/20 hover:bg-indigo-500/20 text-xs font-black text-indigo-50 rounded-xl transition-all shadow-[0_0_15px_rgba(99,102,241,0.15)] hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] border border-indigo-400/30 hover:border-indigo-400/60 uppercase tracking-widest\"",
    "className=\"w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-xs font-black text-white rounded-xl transition-all shadow-[0_4px_15px_rgba(79,70,229,0.4)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.5)] border-none uppercase tracking-widest\""
)

with open(home_path, 'w') as f:
    f.write(home_content)
    
