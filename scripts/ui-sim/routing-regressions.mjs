// Contract tests: API responses are isolated fixtures; backend integration tests exercise PostgreSQL.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { APP, CHROME } from './nav.mjs';
const browser = await chromium.launch({executablePath:CHROME,args:['--no-sandbox']});
const page = await browser.newPage({viewport:{width:1500,height:1000}});
page.setDefaultTimeout(8000);
const errors=[];page.on('pageerror',e=>errors.push(String(e)));
const writes=[];
const routeDTO={id:42,code:4,item_code:'BU-050',description:'Roteiro da bucha',alternative:1,is_standard:true};
const routeOps=[{id:1001,operation_id:7,sequence:10,operation_name:'Cortar'},{id:1002,operation_id:8,sequence:20,operation_name:'Montar'}];
// Prontidão: uma pendência que trava o MRP e uma ressalva que só distorce o custo.
const prontidao={route_id:42,item_code:'BU-050',description:'Roteiro da bucha',ready:false,steps:2,
 issues:['nenhuma máquina de SOLDAGEM MIG tem a produtividade deste item cadastrada (etapas [20]): sem isso o planejamento não tem onde rodar a ordem'],
 warnings:['SOLDAGEM MIG está sem tarifa por hora (VCUS0100): as etapas [20] entram no custo valendo zero'],
 work_centers:[{work_center_id:8,work_center_name:'LASER',steps:[10],has_machine:true,has_rate:true,hourly_rate:37.09},
               {work_center_id:9,work_center_name:'SOLDAGEM MIG',steps:[20],has_machine:false,has_rate:false,hourly_rate:0}]};
const order={id:11,item_code:'BU-050',planned_qty:10,status:'IN_PROGRESS'};
const orderOps=[{id:21,sequence:10,operation_name:'Cortar',status:'PENDING',can_start:true},{id:22,sequence:20,operation_name:'Montar',status:'PENDING',can_start:false}];
await page.addInitScript(()=>localStorage.setItem('erp-auth-storage',JSON.stringify({state:{token:'isolated-ui-test',userName:'Teste',user:{name:'Teste',role:'ADMIN'},expiresAt:null},version:0})));
await page.route('**/*',async route=>{
 const url=new URL(route.request().url());const p=url.pathname;
 if(!p.startsWith('/api/') && !p.startsWith('/users/')) return route.continue();
 let body=[];
 if(route.request().method()==='POST'){writes.push({p,body:route.request().postDataJSON()});body=route.request().postDataJSON();}
 else if(p==='/api/routing/routes/42')body={route:routeDTO,operations:routeOps,network:[]};
 else if(p==='/api/routing/routes/42/readiness')body=prontidao;
 else if(p==='/api/routing/routes')body=[routeDTO];
 else if(p==='/api/production-order/list')body=[order];
 else if(p==='/api/production-order/11')body=order;
 else if(p==='/api/production-order/11/operations')body=orderOps;
 else if(p==='/users/me')body={id:'test',name:'Teste',role:'ADMIN'};
 else if(p==='/api/version')body={version:'1.1.32',min_client:'1.0.0'};
 else if(p==='/api/standard-cost/work-centers')body={items:[{id:8,code:9,name:'Laser Calfran'}],total:1};
 else if(p==='/api/items/')body=[{code:'BU-050',description:'Bucha'}];
 if(p==='/api/production-order/operations/advance' && route.request().method()==='POST') {
   const dto=route.request().postDataJSON();const op=orderOps.find(o=>o.id===dto.operation_id);
   op.execution_history ??= [];op.execution_history.push({id:op.execution_history.length+1,status:dto.status,actor:'Operador da simulação',occurred_at:new Date().toISOString()});
   op.status=dto.status;op.can_start=['PAUSED','INTERRUPTED'].includes(op.status);
   if(dto.status==='DONE')orderOps[1].can_start=true;
   body=op;
 }
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
});
try {
 await page.goto(`${APP}/#/screen/VCUS0100`);
 await page.getByRole('tab',{name:'Custo padrão',exact:true}).waitFor();
 assert.equal(await page.getByRole('tab').count(),5);
 assert.equal(await page.getByRole('tabpanel').count(),1);
 await page.getByRole('tab',{name:'Centros de trabalho',exact:true}).click();
 assert.equal(await page.getByRole('tabpanel').count(),1);
 await page.getByRole('tabpanel').locator('.erp-lookup-control').click();
 await page.locator('.erp-lookup-item').filter({hasText:'Laser Calfran'}).click();
 await page.getByRole('tabpanel').locator('input[type=number]').fill('75');
 await page.getByRole('tab',{name:'Custo padrão',exact:true}).click();
 await page.getByRole('tab',{name:'Centros de trabalho',exact:true}).click();
 assert.equal(await page.getByRole('tabpanel').locator('input[type=number]').inputValue(),'75');
 await page.getByRole('button',{name:'Salvar custo/hora',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.erp-feedback')?.textContent.includes('atualizado'));
 assert.equal(writes.find(w=>w.p.endsWith('/work-center-costs')).body.work_center_id,8);
 await page.goto(`${APP}/#/screen/VSUP0110`);
 const de=page.getByRole('combobox',{name:'De (UM)',exact:true});await de.waitFor();
 await de.selectOption('CX');await page.getByRole('combobox',{name:'Para (UM)',exact:true}).selectOption('UN');
 assert.equal(await de.locator('option').count(),16);
 assert.equal(await page.getByRole('combobox',{name:'De na simulação',exact:true}).count(),1);
 assert.equal(await page.getByRole('combobox',{name:'Para na simulação',exact:true}).count(),1);
 await page.goto(`${APP}/#/screen/VENT0202`);
 console.log('Checking routing tabs');
 await page.getByRole('button',{name:'Roteiros do item',exact:true}).click();
 await page.locator('.erp-toolbar .erp-lookup-control').click();
 await page.locator('.erp-lookup-item').filter({hasText:'Bucha'}).click();
 await page.getByRole('button',{name:'+ Criar roteiro',exact:true}).click();
 await page.getByRole('button',{name:'Abrir',exact:true}).click();
 // A pendência precisa aparecer ENQUANTO se monta o roteiro, não na recusa do MRP.
 const aviso=page.locator('.fsc-rot-prontidao.falha');
 await aviso.waitFor();
 const textoProntidao=await aviso.textContent();
 assert.match(textoProntidao,/1 pendência\(s\)/,`painel não contou as pendências: ${textoProntidao}`);
 assert.ok(textoProntidao.includes('SOLDAGEM MIG'),'a pendência precisa nomear o centro');
 assert.ok(textoProntidao.includes('sem tarifa'),'a ressalva de custo precisa aparecer junto');
 assert.equal(await page.locator('.fsc-rot-centros span.pendente').count(),1,'só o centro incompleto é marcado como pendente');
 assert.equal(await page.locator('.fsc-rot-centros span.ok').count(),1);
 await page.getByRole('button',{name:'Rede de dependências',exact:true}).click();
 const selects=page.locator('.erp-detail-body select');
 await selects.nth(0).selectOption('1001');await selects.nth(1).selectOption('1002');
 await page.getByRole('button',{name:'+',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.erp-feedback')?.textContent.includes('Dependência criada'));
 assert.equal(writes.find(w=>w.p==='/api/routing/routes').body.item_code,'BU-050');
 assert.deepEqual(writes.find(w=>w.p==='/api/routing/routes/42/edges').body,{predecessor_id:1001,successor_id:1002,overlap_pct:0});
 await page.goto(`${APP}/#/screen/VPRO0900`);
 console.log('Checking production execution');
 await page.getByRole('button',{name:'Listar',exact:true}).click();
 await page.getByRole('button',{name:'Abrir',exact:true}).click();
 await page.getByRole('button',{name:'Iniciar etapa',exact:true}).click();
 await page.getByRole('button',{name:'Pausar',exact:true}).click();
 await page.getByText('Informe o motivo da pausa ou interrupção.',{exact:true}).waitFor();
 await page.locator('#operation-reason').fill('Intervalo');
 await page.getByRole('button',{name:'Pausar',exact:true}).click();
 await page.getByRole('button',{name:'Retomar',exact:true}).click();
 await page.locator('#operation-reason').fill('Manutenção');
 await page.getByRole('button',{name:'Interromper',exact:true}).click();
 await page.getByRole('button',{name:'Retomar',exact:true}).click();
 // Concluir sem apontar nada não pode passar: horas e peças são o que gasta a
 // vida útil da ferramenta, e o backend ignora o consumo quando os dois são zero.
 await page.getByRole('button',{name:'Concluir etapa',exact:true}).click();
 await page.getByText(/desconta a vida útil da ferramenta/).waitFor();
 assert.equal(orderOps[0].status,'IN_PROGRESS','etapa foi concluída sem apontamento');
 await page.locator('#operation-qty').fill('120');
 await page.locator('#operation-hours').fill('1.5');
 await page.getByRole('button',{name:'Concluir etapa',exact:true}).click();
 await page.getByRole('button',{name:'Iniciar etapa',exact:true}).waitFor();
 assert.equal(orderOps[0].status,'DONE');assert.equal(orderOps[1].status,'PENDING');
 const avancos=writes.filter(w=>w.p.endsWith('/operations/advance'));
 assert.deepEqual(avancos.map(w=>w.body.status),['IN_PROGRESS','PAUSED','IN_PROGRESS','INTERRUPTED','IN_PROGRESS','DONE']);
 const conclusao=avancos.at(-1).body;
 assert.equal(conclusao.produced_qty,120,'a conclusão precisa levar as peças produzidas');
 assert.equal(conclusao.actual_hours,1.5,'a conclusão precisa levar as horas apontadas');
 await page.getByText('Histórico da execução',{exact:true}).click();
 assert.equal(await page.locator('details li').filter({hasText:'Operador da simulação'}).count(),6);
 assert.deepEqual(errors,[]);
 await page.screenshot({path:'/tmp/venture-unidades.png',fullPage:true});
 console.log('PASS: abas, campos preservados, código/ID, unidades, payloads das abas 2 e 5, ciclo de execução e ausência de erros JS.');
} finally {await browser.close();}
