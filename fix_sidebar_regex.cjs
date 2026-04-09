const fs = require('fs');
const file = '/Users/paulo/Library/Mobile Documents/com~apple~CloudDocs/Automações/portofeliz-system/src/components/Sidebar.jsx';

let content = fs.readFileSync(file, 'utf8');

// The regex might have failed above due to spaces or missing tags. We will rewrite it safely via string replacements for specific blocks.

content = content.replace(/<div className="absolute left-full[^>]+>[\s\S]*?<\/div>/g, '');

content = content.replace(/w-20/g, 'w-24');

// Menu button for expanding
content = content.replace(
    /className=\{\`relative group w-11 h-11 flex items-center justify-center rounded-lg transition-all duration-300 \$\{isOpen\n([^}]+)\`\}/g,
    `className={\`group w-[72px] mx-auto py-2.5 flex flex-col items-center justify-center rounded-xl transition-all duration-300 \${isOpen\n$1\`}`
);

// Main menu Links
content = content.replace(
    /className=\{\`relative group w-11 h-11 flex items-center justify-center rounded-lg transition-all duration-300 \$\{isActive\(item.path\)\n([^}]+)\`\}/g,
    `className={\`group w-[72px] mx-auto py-2.5 flex flex-col items-center justify-center rounded-xl transition-all duration-300 \${isActive(item.path)\n$1\`}`
);

// Sub menu Links
content = content.replace(
    /className=\{\`relative z-10 group w-9 h-9 ml-3 flex items-center justify-center rounded-lg transition-all duration-300 \$\{isActive\(sub.path\)\n([^}]+)\`\}/g,
    `className={\`z-10 group w-[64px] ml-1 py-2 flex flex-col items-center justify-center rounded-xl transition-all duration-300 \${isActive(sub.path)\n$1\`}`
);

// LogOut Button
content = content.replace(
    /className="mt-auto w-11 h-11 flex items-center justify-center rounded-lg text-slate-500 hover:bg-rose-500\/20 hover:text-rose-600 transition-all duration-300 group relative"/g,
    'className="mt-auto w-[72px] mx-auto py-2.5 flex flex-col items-center justify-center rounded-xl text-slate-500 hover:bg-rose-500/20 hover:text-rose-600 transition-all duration-300 group"'
);

// Sub line
content = content.replace(
    /className="absolute left-1\/2 -translate-x-\[18px\] top-0 bottom-4 w-px bg-slate-300\/50"/g,
    'className="absolute left-1/2 -translate-x-[26px] top-0 bottom-4 w-px bg-slate-200"'
);

// Labels
// Since we used regex above and it might be messy, let's just use AST/JSX regex for icons.
content = content.replace(
    /<item.icon size=\{18\} strokeWidth=\{isOpen \? 2\.5 : 2\} \/>/g,
    '<item.icon size={20} className="mb-1" strokeWidth={isOpen ? 2.5 : 2} />\n                                    <span className="text-[9px] font-bold uppercase tracking-tighter text-center leading-[1]">{item.label}</span>'
);

content = content.replace(
    /<item.icon size=\{18\} strokeWidth=\{isActive\(item.path\) \? 2\.5 : 2\} \/>/g,
    '<item.icon size={20} className="mb-1" strokeWidth={isActive(item.path) ? 2.5 : 2} />\n                            <span className="text-[9px] font-bold uppercase tracking-tighter text-center leading-[1]">{item.label}</span>'
);

content = content.replace(
    /<sub.icon size=\{14\} strokeWidth=\{isActive\(sub.path\) \? 2\.5 : 2\} \/>/g,
    '<sub.icon size={16} className="mb-1" strokeWidth={isActive(sub.path) ? 2.5 : 2} />\n                                                <span className="text-[8px] font-bold uppercase tracking-tighter text-center leading-[1]">{sub.label.replace("Laudo ", "").replace("Avaliação ", "")}</span>'
);

content = content.replace(
    /<LogOut size=\{18\} \/>/g,
    '<LogOut size={20} className="mb-1" />\n                <span className="text-[9px] font-bold uppercase tracking-tighter text-center leading-[1]">Sair</span>'
);


fs.writeFileSync(file, content, 'utf8');
console.log('Sidebar Fixed Reactively');
