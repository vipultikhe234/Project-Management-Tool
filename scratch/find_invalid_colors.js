const fs = require('fs');
const path = require('path');

const srcDir = 'D:\\Projects\\PHP Projects\\Project Management System\\web\\src';
const allowedNumbers = new Set([50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]);

const colorRegex = /\b(?:bg|text|border|ring|stroke|fill|from|to|via|hover|focus|active|group-hover|dark:bg|dark:text|dark:border|placeholder)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-(\d+)\b/g;

const foundInvalid = [];

function walk(dir) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            walk(fullPath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css') || file.endsWith('.html')) {
            try {
                const content = fs.readFileSync(fullPath, 'utf8');
                let match;
                while ((match = colorRegex.exec(content)) !== null) {
                    const num = parseInt(match[1], 10);
                    if (!allowedNumbers.has(num)) {
                        foundInvalid.push({
                            file: path.relative(srcDir, fullPath),
                            color: match[0],
                            line: content.substring(0, match.index).split('\n').length
                        });
                    }
                }
            } catch (err) {
                console.error(`Error reading ${fullPath}:`, err);
            }
        }
    });
}

walk(srcDir);

console.log("Found invalid colors:");
foundInvalid.forEach(item => {
    console.log(`${item.file}:${item.line}: ${item.color}`);
});
