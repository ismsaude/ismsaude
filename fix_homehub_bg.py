import re

home_path = '/Users/paulo/Library/Mobile Documents/com~apple~CloudDocs/Automações/ISMSAUDE/src/pages/HomeHub.jsx'
with open(home_path, 'r') as f:
    home_content = f.read()

# Remove the inline style for background image
home_content = re.sub(
    r"style=\{\{\s*backgroundImage: `url\(\$\{bgImage\}\)`,\s*backgroundSize: 'cover',\s*backgroundPosition: 'center',\s*backgroundAttachment: 'fixed'\s*\}\}",
    "",
    home_content
)

# Remove the dark overlay
home_content = re.sub(
    r"<div className=\{\`absolute inset-0 pointer-events-none \$\{isLowEndDevice \? 'bg-slate-900/90' : 'bg-slate-900/70 backdrop-blur-md'\}\`\}></div>",
    "",
    home_content
)

with open(home_path, 'w') as f:
    f.write(home_content)
print("HomeHub.jsx fixed.")

conf_path = '/Users/paulo/Library/Mobile Documents/com~apple~CloudDocs/Automações/ISMSAUDE/src/pages/ConfiguracoesHub.jsx'
with open(conf_path, 'r') as f:
    conf_content = f.read()

# Make cards more opaque
conf_content = conf_content.replace('bg-white/60', 'bg-white/80')
conf_content = conf_content.replace('border-white/60', 'border-white/80')

with open(conf_path, 'w') as f:
    f.write(conf_content)
print("ConfiguracoesHub.jsx fixed.")
