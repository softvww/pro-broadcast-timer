const sharp = require('sharp');
const pngToIco = require('png-to-ico');
const fs = require('fs');

const src = 'C:/Users/Akash Misal/.gemini/antigravity/brain/b5d3fcb6-538a-4b54-a604-31e3dcdc213b/videowaves_timer_icon_1775720323672.png';
const tmp = 'icon_tmp.png';

sharp(src)
    .resize(256, 256)
    .png()
    .toFile(tmp)
    .then(function() {
        console.log('Step 1: Converted to proper PNG');
        return pngToIco(tmp);
    })
    .then(function(buf) {
        fs.writeFileSync('icon.ico', buf);
        if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
        console.log('Step 2: icon.ico created successfully!');
    })
    .catch(function(err) {
        console.error('ERROR:', err.message);
    });
