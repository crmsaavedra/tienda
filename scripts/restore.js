const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const backupDir = path.join(__dirname, '..', 'backups');
const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/autopartes_pro';

function pickBackup() {
  const arg = process.argv[2];
  if (arg) return path.resolve(backupDir, arg);
  const dirs = fs.readdirSync(backupDir).filter(d => /^\d{4}-/.test(d)).sort();
  if (!dirs.length) throw new Error('No hay backups en backups/');
  return path.join(backupDir, dirs[dirs.length - 1]);
}

async function run() {
  const target = pickBackup();
  const manifest = JSON.parse(fs.readFileSync(path.join(target, 'manifest.json'), 'utf8'));
  console.log(`Restaurando backup: ${target} (${manifest.createdAt})`);

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  const db = mongoose.connection.db;
  for (const c of manifest.collections) {
    const docs = JSON.parse(fs.readFileSync(path.join(target, c.file), 'utf8'));
    await db.collection(c.name).deleteMany({});
    if (docs.length) {
      await db.collection(c.name).insertMany(docs, { ordered: false });
    }
    console.log(`  ${c.name}: ${docs.length} documentos`);
  }
  await mongoose.disconnect();
  console.log('Restauración completada.');
}

run().catch(e => { console.error('Error en restauración:', e.message); process.exit(1); });