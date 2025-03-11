import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { 
  getAllElements, 
  getElementById, 
  updateElement, 
  deleteElement,
  createElement,
  elementSchema,
  setupDatabase
} from './db';
import { SSEEdgeTransport } from './mcp/sse.ts';
import { z } from 'zod';

// Initialize database
setupDatabase();

// Create Hono app
const app = new Hono();
const PORT = 5000;

const server = new McpServer({
  name: "element-mcp-server",
  version: "1.0.0"
});

server.tool("getElementById",
  { id: z.string() },
  async ({ id }) => {
    const element = getElementById(id);
    return {
      content: [{ type: "text", text: JSON.stringify(element) }]
    }
  }
);

// Add CORS middleware
app.use('/*', cors());

// Element Routes
app.get('/api/elements', async (c) => {
  try {
    const elements = getAllElements();
    return c.json(elements);
  } catch (error) {
    console.error('Error fetching elements:', error);
    return c.json({ error: 'Failed to fetch elements' }, 500);
  }
});

app.get('/api/elements/:elementId', async (c) => {
  try {
    const elementId = c.req.param('elementId');
    const element = getElementById(elementId);
    
    if (!element) {
      return c.json({ error: 'Element not found' }, 404);
    }
    
    return c.json(element);
  } catch (error) {
    console.error(`Error fetching element ${c.req.param('elementId')}:`, error);
    return c.json({ error: 'Failed to fetch element' }, 500);
  }
});

app.post('/api/elements', async (c) => {
  try {
    const body = await c.req.json();
    const result = elementSchema.safeParse(body);
    
    if (!result.success) {
      return c.json({ error: 'Invalid request body' }, 400);
    }
    
    const newElement = createElement(result.data);
    return c.json(newElement, 201);
  } catch (error) {
    console.error('Error creating element:', error);
    return c.json({ error: 'Failed to create element' }, 500);
  }
});

app.put('/api/elements/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const result = elementSchema.safeParse(body);
    
    if (!result.success) {
      return c.json({ error: 'Invalid request body' }, 400);
    }
    
    const updatedElement = updateElement(parseInt(id), result.data);
    return c.json(updatedElement);
  } catch (error) {
    console.error(`Error updating element ${c.req.param('id')}:`, error);
    return c.json({ error: 'Failed to update element' }, 500);
  }
});

app.delete('/api/elements/:id', async (c) => {
  try {
    const id = c.req.param('id');
    deleteElement(parseInt(id));
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error(`Error deleting element ${c.req.param('id')}:`, error);
    return c.json({ error: 'Failed to delete element' }, 500);
  }
});
let transport: SSEEdgeTransport;

app.get("/sse", async (c) => {
  const uuid = crypto.randomUUID();
  transport = new SSEEdgeTransport("/messages", uuid);
  await server.connect(transport);
  return transport.sseResponse;
});

app.post('/messages', async (c) => {
  return transport.handlePostMessage(c);
})

// Health check endpoint
app.get('/health', (c) => c.json({ status: 'ok' }));

// Start server
Bun.serve({
  fetch: app.fetch,
  port: PORT,
  idleTimeout: 100,
});

console.log(`Server running on http://localhost:${PORT}`); 