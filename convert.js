const fs = require('fs');
const pngToIco = require('png-to-ico');

pngToIco('C:\\Users\\Akash Misal\\.gemini\\antigravity\\brain\\b5d3fcb6-538a-4b54-a604-31e3dcdc213b\\videowaves_timer_icon_1775720323672.png')
  .then(buf => {
    fs.writeFileSync('icon.ico', buf);
    console.log('✅ Icon converted successfully!');
  })
  .catch(console.error);
