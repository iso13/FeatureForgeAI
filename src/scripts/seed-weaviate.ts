import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import {
  getWeaviateClient,
  createSchemaIfNeeded,
  importDocuments,
} from '../utils/weaviateClient';

// Load environment variables
dotenv.config();

async function seedWeaviate() {
  try {
    console.log('Connecting to Weaviate...');
    getWeaviateClient(); // Ensure client is initialized

    console.log('Creating schema if not exists...');
    await createSchemaIfNeeded();

    const filePath = path.resolve(__dirname, '../data/internal_docs.json');
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing internal_docs.json at ${filePath}`);
    }

    const docs = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    console.log(`Importing ${docs.length} documents...`);
    await importDocuments(docs);

    console.log('Weaviate seeding complete!');
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seedWeaviate();