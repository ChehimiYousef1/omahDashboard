require('dotenv').config();
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

(async () => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.join('backup-mongo', stamp);
  fs.mkdirSync(path.join(dir, 'mongo'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'json'), { recursive: true });

  const uri = process.env.MONGODB_URI;
  if (uri && process.env.DISABLE_MONGO !== 'true') {
    const client = await MongoClient.connect(uri);
    const db = client.db();
    for (const c of await db.listCollections().toArray()) {
      const docs = await db.collection(c.name).find({}).toArray();
      fs.writeFileSync(path.join(dir, 'mongo', c.name + '.json'), JSON.stringify(docs, null, 2));
      console.log('mongo/' + c.name + ': ' + docs.length + ' docs');
    }
    await client.close();
  } else {
    console.log('MongoDB skipped');
  }

  if (fs.existsSync('data')) {
    for (const f of fs.readdirSync('data').filter(x => x.endsWith('.json'))) {
      fs.copyFileSync(path.join('data', f), path.join(dir, 'json', f));
      console.log('json/' + f);
    }
  }
  console.log('Saved to ' + dir);
})();
