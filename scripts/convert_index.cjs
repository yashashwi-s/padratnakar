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

const rawData = JSON.parse(fs.readFileSync('./index_raw.json', 'utf-8'));

const convertedData = rawData.map(item => {
    return {
        size: item.size,
        text: chanakyaToUnicode(item.text).trim()
    };
});

fs.writeFileSync('./index_unicode.json', JSON.stringify(convertedData, null, 2), 'utf-8');
console.log('Saved to index_unicode.json');
