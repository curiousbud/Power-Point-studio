// Optional development dependency: npm install --no-save playwright
const {
    chromium
}
=require('playwright');
const assert=require('node:assert/strict');
const {
    pathToFileURL
}
=require('node:url');
const path=require('node:path');
(async()=>{
    const browser=await chromium.launch({
        headless:true
    });
    try{
        const page=await browser.newPage({
            viewport:{
                width:1500,height:950
            }
        });
        const errors=[];
        page.on('pageerror',e=>errors.push(e.message));
        await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
        await page.click('#addText');
        await page.fill('#text','A "quoted" title\nSecond line');
        await page.locator('#text').blur();
        await page.fill('#x','1.23456');
        await page.locator('#x').blur();
        assert.equal(await page.inputValue('#x'),'1.23456');
        const before=await page.inputValue('#code');
        await page.selectOption('#zoom','2');
        assert.equal(await page.inputValue('#code'),before);
        await page.selectOption('#unit','pt');
        assert.ok(Math.abs(Number(await page.inputValue('#x'))-88.88832)<.0001);
        await page.selectOption('#unit','in');
        await page.fill('#rotation','35');
        await page.locator('#rotation').blur();
        await page.selectOption('#zoom','fit');
        const el=page.locator('.element');
        const b=await el.boundingBox();
        await page.mouse.move(b.x+b.width/2,b.y+b.height/2);
        await page.mouse.down();
        await page.mouse.move(b.x+b.width/2+55,b.y+b.height/2+30);
        await page.mouse.up();
        assert.notEqual(await page.inputValue('#x'),'1.23456');
        await page.click('#undo');
        assert.equal(await page.inputValue('#x'),'1.23456');
        await page.check('#locked');
        await page.click('#delete');
        assert.equal(await page.locator('.element').count(),1);
        await page.uncheck('#locked');
        await page.click('#duplicate');
        assert.equal(await page.locator('.element').count(),2);
        await page.click('#undo');
        assert.equal(await page.locator('.element').count(),1);
        await page.fill('#w','0');
        await page.locator('#w').blur();
        assert.equal(await page.inputValue('#w'),'3');
        await page.selectOption('#preset','standard');
        await page.click('#applySize');
        assert.equal(await page.inputValue('#sw'),'10');
        const dl=page.waitForEvent('download');
        await page.click('#save');
        assert.equal((await dl).suggestedFilename(),'slide-layout.json');
        const data=await page.evaluate(()=>JSON.stringify(project));
        const malformed=JSON.parse(data);
        malformed.elements[0].w=-1;
        await page.setInputFiles('#jsonFile',{
            name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(malformed))
        });
        assert.match(await page.locator('#status').textContent(),/Import failed/);
        assert.equal(await page.locator('.element').count(),1);
        await page.evaluate(()=>{
            project.elements[0].text='<img src=x onerror=alert(1)>';
            render();
        });
        assert.equal(await page.locator('.element img').count(),0);
        assert.deepEqual(errors,[]);
        console.log('Browser integration checks passed (Chromium, direct file opening).');
    }
    finally{
        await browser.close();
    }
})().catch(e=>{
    console.error(e);
    process.exitCode=1;
});
