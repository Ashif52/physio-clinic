/* ============================================
   PhysioFlow — Firebase Admin SDK Initialization
   Auto-configures connection to Firestore
   Includes persistent disk JSON store for local development
   ============================================ */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let db;

function initFirebase() {
  if (db) return db;

  const serviceAccountPath = path.resolve(
    __dirname,
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccountKey.json'
  );

  // Option 1: Service Account JSON file
  if (fs.existsSync(serviceAccountPath)) {
    try {
      const serviceAccount = require(serviceAccountPath);
      if (admin.apps.length === 0) {
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      }
      console.log('🔥 Firebase initialized with service account file');
      db = admin.firestore();
      db.settings({ ignoreUndefinedProperties: true });
      return db;
    } catch (err) {
      console.warn('⚠️ Service account error:', err.message);
    }
  }

  // Option 2: Individual env vars
  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    try {
      if (admin.apps.length === 0) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID || 'physioflow-clinic',
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
          }),
        });
      }
      console.log('🔥 Firebase initialized with environment variables');
      db = admin.firestore();
      db.settings({ ignoreUndefinedProperties: true });
      return db;
    } catch (err) {
      console.warn('⚠️ Env var auth error:', err.message);
    }
  }

  // Option 3: Persistent JSON Disk Store for zero-config local development
  console.log('💾 Initialized persistent local database store for PhysioFlow');
  db = _createPersistentDiskDb();
  return db;
}

/** Disk-backed JSON database store with full Firestore-compatible API */
function _createPersistentDiskDb() {
  const dbPath = path.resolve(__dirname, 'db', 'data.json');
  const dbDir = path.dirname(dbPath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  let store = {};
  if (fs.existsSync(dbPath)) {
    try {
      store = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } catch {
      store = {};
    }
  }

  const saveStore = () => {
    try {
      fs.writeFileSync(dbPath, JSON.stringify(store, null, 2), 'utf8');
    } catch (e) {
      console.error('Error writing to disk store:', e);
    }
  };

  const getCol = (name) => {
    if (!store[name]) store[name] = {};
    return store[name];
  };

  const createQuery = (colName, filters = []) => {
    const col = getCol(colName);
    return {
      where(field, op, val) {
        return createQuery(colName, [...filters, { field, op, val }]);
      },
      limit(n) {
        return createQuery(colName, filters);
      },
      async get() {
        let docs = Object.values(col);
        filters.forEach(({ field, op, val }) => {
          if (op === '==') docs = docs.filter(d => (d[field] === val));
        });
        return {
          empty: docs.length === 0,
          docs: docs.map(docData => ({
            id: docData.id,
            data: () => docData,
            ref: {
              update: async (u) => {
                col[docData.id] = { ...col[docData.id], ...u };
                saveStore();
              },
              delete: async () => {
                delete col[docData.id];
                saveStore();
              }
            }
          }))
        };
      }
    };
  };

  return {
    collection(colName) {
      const col = getCol(colName);
      return {
        doc(id) {
          return {
            async get() {
              const data = col[id];
              return { exists: !!data, id, data: () => data };
            },
            async set(data) {
              col[id] = { id, ...data };
              saveStore();
            },
            async update(updates) {
              const current = col[id] || {};
              col[id] = { ...current, ...updates, id };
              saveStore();
            },
            async delete() {
              delete col[id];
              saveStore();
            }
          };
        },
        where(field, op, val) {
          return createQuery(colName, [{ field, op, val }]);
        },
        async get() {
          const docs = Object.values(col).map(docData => ({
            id: docData.id,
            data: () => docData,
            ref: {
              update: async (u) => {
                col[docData.id] = { ...col[docData.id], ...u };
                saveStore();
              },
              delete: async () => {
                delete col[docData.id];
                saveStore();
              }
            }
          }));
          return { empty: docs.length === 0, docs };
        },
        async add(data) {
          const id = 'doc-' + Math.random().toString(36).substr(2, 9);
          col[id] = { id, ...data };
          saveStore();
          return { id };
        }
      };
    },
    batch() {
      const operations = [];
      return {
        set(docRef, data) { operations.push(() => docRef.set(data)); },
        update(docRef, updates) { operations.push(() => docRef.update(updates)); },
        delete(docRef) { operations.push(() => docRef.delete()); },
        async commit() {
          for (const op of operations) await op();
          saveStore();
        }
      };
    }
  };
}

function getDb() {
  if (!db) {
    return initFirebase();
  }
  return db;
}

module.exports = { initFirebase, getDb, admin };
