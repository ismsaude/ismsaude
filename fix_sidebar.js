const fs = require('fs');

const file = '/Users/paulo/Library/Mobile Documents/com~apple~CloudDocs/Automações/portofeliz-system/src/components/Sidebar.jsx';

let content = fs.readFileSync(file, 'utf8');

// 1. Remove the old absolute tooltip spans
content = content.replace(/<div className="absolute left-full[^>]+>[\s\S]*?<\/div>\s*/g, '');

// 2. Adjust Parent menu buttons/links container from w-11 h-11 to flex-col and responsive size, mapping labels correctly
// Actually, let's keep the size dynamic with padding, e.g., p-2 or p-3, instead of fixed width/height so the text fits.

content = content.replace(
    /className=\{(["'`])relative group w-11 h-11 flex items-center justify-center rounded-lg transition-all duration-300 \$\{isOpen\s*\?\s*'bg-blue-50 text-blue-700 shadow-sm border border-blue-100'\s*:\s*'text-slate-600 hover:bg-white\/50 hover:text-blue-600'\s*\}\}\1\s*>/g,
    `className={\`group w-[68px] mx-auto py-3 flex flex-col items-center justify-center rounded-xl transition-all duration-300 \${isOpen
                                        ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100'
                                        : 'text-slate-500 hover:bg-white/50 hover:text-blue-600'
                                        }\`}
                                >`
);

content = content.replace(
    /className=\{(["'`])relative group w-11 h-11 flex items-center justify-center rounded-lg transition-all duration-300 \$\{isActive\(item.path\)\s*\?\s*'bg-white\/60 text-blue-600 font-bold shadow-sm border border-white\/50'\s*:\s*'text-slate-600 hover:bg-white\/50 hover:text-blue-600'\s*\}\}\1\s*>/g,
    `className={\`group w-[68px] mx-auto py-3 flex flex-col items-center justify-center rounded-xl transition-all duration-300 \${isActive(item.path)
                                ? 'bg-white/80 text-blue-600 font-bold shadow-sm border border-white/50'
                                : 'text-slate-500 hover:bg-white/50 hover:text-blue-600'
                                }\`}
                        >`
);

// 3. Add the span with the text below the icon
// For items with subItems (button):
content = content.replace(
    /(<item\.icon size=\{18\} strokeWidth=\{isOpen \? 2\.5 : 2\} \/>)/g,
    '$1\n                                    <span className="text-[9px] font-bold mt-1.5 uppercase tracking-tighter text-center leading-tight">{item.label}</span>'
);

// For normal items (Link):
content = content.replace(
    /(<item\.icon size=\{18\} strokeWidth=\{isActive\(item\.path\) \? 2\.5 : 2\} \/>)/g,
    '$1\n                            <span className="text-[9px] font-bold mt-1.5 uppercase tracking-tighter text-center leading-tight">{item.label}</span>'
);

// 4. Adjust SubItems (Inner Links)
// The inner links were w-9 h-9. Let's make them row based or col based? 
// The user prompt said: "O ícone deve ficar no topo. Logo abaixo do ícone, adicione o nome do menu de forma fixa e minúscula ... Faça isso para Dashboard, Pacientes, Atend., Agenda, Config."
// Let's also adjust the sub items to look good. We will make them flex-col as well, or keep them small but add text.
content = content.replace(
    /className=\{(["'`])relative z-10 group w-9 h-9 ml-3 flex items-center justify-center rounded-lg transition-all duration-300 \$\{isActive\(sub\.path\)\s*\?\s*'bg-white\/80 text-blue-600 font-bold shadow-sm border border-white\/50'\s*:\s*'bg-white\/30 text-slate-500 hover:bg-white\/60 hover:text-blue-600'\s*\}\}\1\s*>/g,
    `className={\`z-10 group w-[60px] ml-1 py-2 flex flex-col items-center justify-center rounded-xl transition-all duration-300 \${isActive(sub.path)
                                                    ? 'bg-white/80 text-blue-600 font-bold shadow-sm border border-white/50'
                                                    : 'bg-white/30 text-slate-500 hover:bg-white/60 hover:text-blue-600'
                                                    }\`}
                                            >`
);

content = content.replace(
    /(<sub\.icon size=\{14\} strokeWidth=\{isActive\(sub\.path\) \? 2\.5 : 2\} \/>)/g,
    '$1\n                                                <span className="text-[8px] font-bold mt-1 uppercase tracking-tighter text-center leading-tight">{sub.label.replace("Laudo ", "").replace("Avaliação ", "")}</span>'
);

// Fix connecting line since we changed sizes and margins
content = content.replace(
    /<div className="absolute left-1\/2 -translate-x-\[18px\] top-0 bottom-4 w-px bg-slate-300\/50"><\/div>/g,
    '<div className="absolute left-1/2 -translate-x-[24px] top-0 bottom-4 w-px bg-slate-200"></div>'
); // Adjusted connecting line visually

// 5. Adjust Logout Button
content = content.replace(
    /className="mt-auto w-11 h-11 flex items-center justify-center rounded-lg text-slate-500 hover:bg-rose-500\/20 hover:text-rose-600 transition-all duration-300 group relative"/g,
    'className="mt-auto w-[68px] mx-auto py-3 flex flex-col items-center justify-center rounded-xl text-slate-500 hover:bg-rose-500/20 hover:text-rose-600 transition-all duration-300 group"'
);

// Remove Logout tooltip and add text
content = content.replace(
    /(<LogOut size=\{18\} \/>)/g,
    '$1\n                <span className="text-[9px] font-bold mt-1.5 uppercase tracking-tighter">Sair</span>'
);

// 6. Fix Sidebar width to accommodate text (w-20 -> w-24)
content = content.replace(
    /<aside className="fixed left-0 top-0 h-screen w-20 /g,
    '<aside className="fixed left-0 top-0 h-screen w-24 '
);

fs.writeFileSync(file, content, 'utf8');
console.log('Sidebar Fixed');
