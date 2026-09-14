require('dotenv').config();
const mongoose = require('mongoose');
const { Part } = require('./models');
const items = [
  ['BAT-004','Batería 60 Ah libre mantenimiento','Bosch','Electricidad',84990,10,'Potencia de arranque confiable para uso urbano y carretera.'],
  ['ACE-005','Aceite sintético 5W-30 4L','Mobil 1','Lubricantes',42990,22,'Lubricación avanzada que protege el motor en condiciones exigentes.'],
  ['COR-006','Kit correa de distribución','Gates','Motor',119990,6,'Kit completo para una sincronización precisa y duradera.'],
  ['EMB-007','Kit de embrague 3 piezas','Valeo','Transmisión',154990,5,'Disco, prensa y rodamiento para un acople suave y seguro.'],
  ['LUC-008','Ampolleta LED H7 6000K','Philips','Electricidad',24990,18,'Iluminación blanca de alto rendimiento y larga vida útil.'],
  ['NEU-009','Neumático 205/55 R16','Michelin','Neumáticos',109990,9,'Agarre, confort y durabilidad para conducción diaria.'],
  ['RAD-010','Radiador de aluminio','Denso','Refrigeración',96990,4,'Disipación eficiente para mantener la temperatura óptima del motor.'],
  ['BUJ-011','Juego de bujías iridium','NGK','Motor',35990,16,'Chispa constante, mejor combustión y mayor vida útil.'],
  ['DIS-012','Disco de freno ventilado','Brembo','Frenos',64990,7,'Diseño ventilado para una respuesta de frenado estable.'],
  ['TER-013','Terminal de dirección','TRW','Suspensión',28990,11,'Componente de dirección de precisión y alta resistencia.'],
  ['AIR-014','Filtro de aire de motor','K&N','Filtros',19990,20,'Flujo de aire optimizado para la protección del motor.'],
  ['BOM-015','Bomba de combustible eléctrica','Delphi','Motor',74990,3,'Suministro confiable de combustible para un desempeño continuo.'],
  ['PAS-016','Pastillas de freno cerámicas (Set 4)','Bosch','Frenos',32990,15,'Baja emisión de polvo y frenado silencioso de alta fricción.'],
  ['FIL-017','Filtro de aceite premium','Mann Filter','Filtros',9990,30,'Protección contra impurezas para la longevidad del motor.'],
  ['LIQ-018','Líquido de frenos DOT 4 1L','Motul','Lubricantes',14990,12,'Alto punto de ebullición para seguridad extrema.']
].map(([sku,name,brand,category,price,stock,description]) => ({ sku,name,brand,category,price,stock,description,image:`https://picsum.photos/seed/${sku}/600/400`,lowStockThreshold:5,technicalSpecs:[{label:'Garantía',value:'6 meses'},{label:'Calidad',value:'Equipo equivalente OEM'}],compatibility:[{make:'Toyota',model:'Corolla',yearFrom:2015,yearTo:2023}] }));
async function run(){await mongoose.connect(process.env.MONGODB_URI||'mongodb://127.0.0.1:27017/autopartes_pro');await Part.bulkWrite(items.map(document=>({updateOne:{filter:{sku:document.sku},update:{$set:document},upsert:true}})));console.log(`${items.length} productos añadidos o actualizados`);await mongoose.disconnect()};run().catch(e=>{console.error(e);process.exit(1)});
