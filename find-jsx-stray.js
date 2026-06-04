const fs = require('fs');
const content = fs.readFileSync('src/pages/Escala.jsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
    // If we find ")}" not part of a tag, string or attribute
    if (line.match(/>\s*\)\}\s*</)) {
        console.log("Found between tags on line", i+1, ":", line);
    } else if (line.match(/>[^<]*\)\}[^<]*</)) {
        console.log("Found inside text node on line", i+1, ":", line);
    }
});
