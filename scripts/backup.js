const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const backupDir = path.join(__dirname, '..', 'backups');
const retentionDays = Number(process.env.BACKUP_RETENTION) || 7;
const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/autopartes_pro';

async function run() {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  const db = mongoose.connection.db;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = path.join(backupDir, stamp);
  fs.mkdirSync(target, { recursive: true });

  const collections = await db.listCollections().toArray();
  const manifest = { createdAt: new Date().toISOString(), uri, collections: [] };
  for (const c of collections) {
    if (c.name.startsWith('system.')) continue;
    const docs = await db.collection(c.name).find({}).toArray();
    const file = path.join(target, `${c.name}.json`);
    fs.writeFileSync(file, JSON.stringify(docs, null, 2), 'utf8');
    manifest.collections.push({ name: c.name, count: docs.length, file });
  }
  fs.writeFileSync(path.join(target, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

  const dirs = fs.readdirSync(backupDir).filter(d => /^\d{4}-/.test(d));
  for (const d of dirs) {
    const ageDays = (Date.now() - fs.statSync(path.join(backupDir, d)).mtimeMs) / 86400000;
    if (ageDays > retentionDays) {
      fs.rmSync(path.join(backupDir, d), { recursive: true, force: true });
      console.log(`Backup eliminado por retención (${Math.round(ageDays)}d): ${d}`);
    }
  }

  console.log(`Backup completado: ${target} (${manifest.collections.length} colecciones, ${manifest.collections.reduce((a, c) => a + c.count, 0)} documentos)`);
  await mongoose.disconnect();
}

run().catch(e => { console.error('Error en backup:', e.message); process.exit(1); });