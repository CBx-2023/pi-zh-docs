// Restore whitespace that the syntax highlighter normalizes, and keep code copying lossless.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {load} from 'cheerio';
import {nodes} from './lib.mjs';
const site=JSON.parse(await readFile('content/site.json','utf8'));
for(const page of site.pages){
 const blocks=nodes(await readFile('upstream/'+page.source,'utf8'),'code');
 const files=[`dist/${page.path}/index.html`,...(page.source==='index.md'?['dist/index.html']:[])];
 for(const file of files){
  const $=load(await readFile(file,'utf8'));const pres=$('#content pre').toArray();assert.equal(pres.length,blocks.length,`${page.source}: missing rendered block`);
  blocks.forEach((block,index)=>{
   const pre=$(pres[index]);if(block.lang==='mermaid'){assert.equal(pre.text(),block.value);return}
   const lines=pre.find('.ec-line .code').toArray();const source=block.value.split('\n');
   assert.equal(lines.length,source.length,`${page.source}: highlighter changed line count in block ${index+1}`);
   source.forEach((line,i)=>{if($(lines[i]).text()!==line)$(lines[i]).text(line)});
   const copy=pre.closest('.expressive-code').find('.copy button');assert.equal(copy.length,1);copy.attr('data-code',block.value.replaceAll('\n','\u007f'));
  });
  await writeFile(file,$.html());
 }
}
console.log('Preserved all rendered code lines and clipboard payloads.');
