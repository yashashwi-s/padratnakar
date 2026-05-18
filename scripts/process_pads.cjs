const fs = require('fs');

const originalMatch = String.prototype.match;
String.prototype.match = function(regexp) {
    if (typeof regexp === 'string') {
        regexp = regexp.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    }
    return originalMatch.call(this, regexp);
};

const chanakyaCode = fs.readFileSync('./chanakya2Unicode.js', 'utf-8');
eval(chanakyaCode);

// 1. Read information.md to build a mapping of Pad ID -> { section, subtopic }
const infoLines = fs.readFileSync('information.md', 'utf-8').split('\n');
const padToSectionMap = {};
let allSections = new Set();

for (const line of infoLines) {
    // Expected format: - **Topic -> Subtopic**: Pads 1 to 50
    const match = line.match(/- \*\*(.+?)\*\*: Pads (\d+) to (\d+)/);
    if (match) {
        let fullTopic = match[1];
        let start = parseInt(match[2]);
        let end = parseInt(match[3]);
        
        let section = fullTopic;
        let subtopic = null;
        if (fullTopic.includes('->')) {
            const parts = fullTopic.split('->');
            section = parts[0].trim();
            subtopic = parts[1].trim();
        }
        allSections.add(section);
        
        for (let i = start; i <= end; i++) {
            padToSectionMap[i] = { section, subtopic };
        }
    }
}

// 2. Read raw pads and convert
const rawPads = JSON.parse(fs.readFileSync('raw_pads.json', 'utf-8'));
const hymns = [];

rawPads.forEach(pad => {
    let unicodeText = chanakyaToUnicode(pad.raw_text);
    
    // Clean up text
    const lines = unicodeText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    let raag = "";
    let taal = "";
    let verses = [];
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        
        // Match Raag/Taal e.g. (राग भैरवी-ताल कहरवा) or (राग-आसावरी)
        if (line.startsWith('(') && line.includes('राग')) {
            line = line.replace(/[()]/g, ''); // remove parens
            const parts = line.split(/[-—–]/);
            for (let part of parts) {
                if (part.includes('राग')) raag = part.replace('राग', '').trim();
                else if (part.includes('ताल')) taal = part.replace('ताल', '').trim();
                else if (!raag) raag = part.trim();
            }
            continue;
        }
        
        verses.push(line);
    }
    
    let title = verses.length > 0 ? verses[0] : "";
    
    let sectionInfo = padToSectionMap[pad.id] || { section: "अन्य", subtopic: null };

    hymns.push({
        id: pad.id,
        title: title,
        section: sectionInfo.section,
        subtopic: sectionInfo.subtopic,
        raag: raag,
        taal: taal,
        verses: verses,
        footnotes: [] // Footnotes are mixed in verses for now, can be improved later
    });
});

fs.writeFileSync('src/data/hymns.json', JSON.stringify(hymns, null, 2));

const sectionsArray = Array.from(allSections).map(s => ({
    name: s,
    padCount: hymns.filter(h => h.section === s).length
}));
fs.writeFileSync('src/data/sections.json', JSON.stringify(sectionsArray, null, 2));

console.log(`Saved ${hymns.length} pads to src/data/hymns.json`);
