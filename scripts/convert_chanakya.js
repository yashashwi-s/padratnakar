const fs = require('fs');

// We will read the chanakya2Unicode.js file and eval it so we get the chanakyaToUnicode function.
// Since it's meant for the browser and uses `document` inside `toUnicode()`, we just need the `chanakyaToUnicode` function.
// However, the obfuscated code defines `chanakyaToUnicode` globally. We'll just read and eval it.
// Monkey-patch String.prototype.match to escape strings that are passed as regex
const originalMatch = String.prototype.match;
String.prototype.match = function(regexp) {
    if (typeof regexp === 'string') {
        regexp = regexp.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    }
    return originalMatch.call(this, regexp);
};

const chanakyaCode = fs.readFileSync('./chanakya2Unicode.js', 'utf-8');
eval(chanakyaCode);

const inputFile = './raw_text.txt';
const outputFile = './converted_text.txt';

console.log('Reading raw text...');
const rawText = fs.readFileSync(inputFile, 'utf-8');

console.log('Converting to Unicode in chunks...');
const lines = rawText.split('\n');
const convertedLines = lines.map((line, index) => {
    if (index % 1000 === 0) console.log(`Processed ${index} lines...`);
    return chanakyaToUnicode(line);
});
const convertedText = convertedLines.join('\n');

console.log('Writing converted text...');
fs.writeFileSync(outputFile, convertedText, 'utf-8');

console.log('Done! Saved to converted_text.txt');
