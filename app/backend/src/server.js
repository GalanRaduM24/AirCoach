import express from 'express';
import dotenv from 'dotenv';
import aiSqlRouter from './aiSql.js';
import agentRouter from './agent.js';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || 'development' });
});

app.use('/ai/sql', aiSqlRouter);
app.use('/agent', agentRouter);

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`AI backend listening on port ${port}`);
  console.log(`Agent endpoints available at http://localhost:${port}/agent`);
});
