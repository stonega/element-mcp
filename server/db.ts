import { Database } from 'bun:sqlite';
import { z } from 'zod';

// Define types
type Element = {
  id?: number;
  elementId: string;
  tagName: string;
  innerHTML?: string;
  outerHTML?: string;
  xpath?: string;
  cssSelector?: string;
  timestamp: string;
};

// Define the database instance
let db: Database | null = null;

export function getDb(): Database {
  if (!db) {
    db = new Database('elements.db');
  }
  return db;
}

// Schema definition using Zod
export const elementSchema = z.object({
  elementId: z.string(),
  tagName: z.string(),
  innerHTML: z.string().optional(),
  outerHTML: z.string().optional(),
  xpath: z.string().optional(),
  cssSelector: z.string().optional(),
  timestamp: z.string()
});

export function createElement(elementData: Element): Element {
  const db = getDb();
  
  const stmt = db.prepare(`
    INSERT INTO elements (elementId, tagName, innerHTML, outerHTML, xpath, cssSelector, timestamp) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    elementData.elementId,
    elementData.tagName,
    elementData.innerHTML || '',
    elementData.outerHTML || '',
    elementData.xpath || '',
    elementData.cssSelector || '',
    elementData.timestamp
  );
  
  return {
    id: (db.query('SELECT last_insert_rowid() as id').get() as { id: number }).id,
    ...elementData
  };
}

export function getAllElements(): Element[] {
  const db = getDb();
  return db.query('SELECT * FROM elements ORDER BY timestamp DESC').all() as Element[];
}

export function getElementById(elementId: string): Element | null {
  const db = getDb();
  return db.query('SELECT * FROM elements WHERE elementId = ?').get(elementId) as Element;
}

export function updateElement(id: number, elementData: Element): Element | null {
  const db = getDb();
  
  const stmt = db.prepare(`
    UPDATE elements 
    SET tagName = ?, innerHTML = ?, outerHTML = ?, xpath = ?, cssSelector = ?, timestamp = ?
    WHERE id = ?
  `);
  
  stmt.run(
    elementData.tagName,
    elementData.innerHTML || '',
    elementData.outerHTML || '',
    elementData.xpath || '',
    elementData.cssSelector || '',
    elementData.timestamp,
    id
  );
  
  return getElementById(elementData.elementId);
}

export function deleteElement(id: number): void {
  const db = getDb();
  db.prepare('DELETE FROM elements WHERE id = ?').run(id);
}

export function setupDatabase(): void {
  const db = getDb();
  
  // Create elements table if it doesn't exist
  db.query(`
    CREATE TABLE IF NOT EXISTS elements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      elementId TEXT NOT NULL,
      tagName TEXT NOT NULL,
      innerHTML TEXT,
      outerHTML TEXT,
      xpath TEXT,
      cssSelector TEXT,
      timestamp TEXT NOT NULL
    )
  `);

  // Add index for faster lookups by elementId
  db.query(`
    CREATE INDEX IF NOT EXISTS idx_elementId ON elements(elementId)
  `);
}