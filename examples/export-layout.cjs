#!/usr/bin/env node  // Headless export: node examples/export-layout.cjs layout.json python output.py
const fs=require('node:fs');
const C=require('../src/core.js');
try {
    const [input,format,output]=process.argv.slice(2);
    if(!input||!['python','js'].includes(format)||!output)throw Error('Usage: node examples/export-layout.cjs INPUT.json python|js OUTPUT');
    if(fs.statSync(input).size>25000000)throw Error('Input exceeds 25 MB.');
    const layout=C.validate(JSON.parse(fs.readFileSync(input,'utf8')));
    // Exclusive write protects existing scripts. Choose a new output filename.
    fs.writeFileSync(output,format==='python'?C.python(layout):C.javascript(layout),{
        flag:'wx'
    });
    console.log('Exported '+layout.elements.filter(e=>!e.hidden).length+' visible elements.');
}
catch(e) {
    console.error(e.message);
    process.exitCode=1;
}
