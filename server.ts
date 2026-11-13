import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'dip-bhola-network-api' });
  });

  app.post('/api/ai/monitoring-report', async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'GEMINI_API_KEY কনফিগার করা নেই। AI Studio Secrets প্যানেলে API Key যুক্ত করুন।'
      });
      return;
    }

    try {
      const payload = req.body || {};
      const companyName = String(payload.companyName || 'DIP BHOLA NETWORK');
      const periodLabel = String(payload.periodLabel || 'চলতি হিসাব');
      const totalRecords = Number(payload.totalRecords || 0);
      const totalIncome = Number(payload.totalIncome || 0);
      const totalExpense = Number(payload.totalExpense || 0);
      const netBalance = Number(payload.netBalance || 0);
      const categorySummary = Array.isArray(payload.categorySummary) ? payload.categorySummary : [];
      const staffActivity = Array.isArray(payload.staffActivity) ? payload.staffActivity : [];
      const recentTransactions = Array.isArray(payload.recentTransactions) ? payload.recentTransactions : [];
      const partners = Array.isArray(payload.partners) ? payload.partners : [];
      const complaintsSummary = payload.complaintsSummary || {};

      const prompt = [
        `প্রতিষ্ঠান: ${companyName}`,
        `প্রতিবেদনের সময়সীমা: ${periodLabel}`,
        `মোট লেনদেন সংখ্যা: ${totalRecords}`,
        `মোট আয় / জমা: ৳${totalIncome}`,
        `মোট ব্যয় / খরচ: ৳${totalExpense}`,
        `নিট ক্যাশ ব্যালেন্স: ৳${netBalance}`,
        `ক্যাটাগরি সারসংক্ষেপ: ${JSON.stringify(categorySummary.slice(0, 15))}`,
        `স্টাফ/এন্ট্রিদাতা কার্যক্রম: ${JSON.stringify(staffActivity.slice(0, 15))}`,
        `অংশীদার বণ্টন: ${JSON.stringify(partners.slice(0, 10))}`,
        `অভিযোগ/সার্ভিস অবস্থা: ${JSON.stringify(complaintsSummary)}`,
        `সাম্প্রতিক নমুনা লেনদেন: ${JSON.stringify(recentTransactions.slice(0, 25))}`,
        '',
        'উপরোক্ত তথ্যের ভিত্তিতে সম্পূর্ণ বাংলায় একটি পেশাদার, নিখুঁত এবং তথ্যভিত্তিক AI মনিটরিং ও অডিট প্রতিবেদন তৈরি করুন। কোনো কাল্পনিক সংখ্যা যোগ করবেন না — প্রদত্ত হিসাব থেকেই বিশ্লেষণ দিন।'
      ].join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'You are the automated AI Financial Monitoring & Audit Officer for an ISP & Broadband business in Bangladesh (DIP BHOLA NETWORK). Always reply strictly in clear, formal Bengali matching the JSON schema. Base all numbers strictly on the provided payload.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              healthStatus: {
                type: Type.STRING,
                description:
                  'One of: অত্যন্ত ভালো (Excellent), সন্তোষজনক (Good), সতর্কতা প্রয়োজন (Warning), জরুরি পর্যবেক্ষণ (Critical)'
              },
              auditScore: {
                type: Type.INTEGER,
                description: 'Integer audit confidence & financial monitoring score from 0 to 100'
              },
              executiveSummary: {
                type: Type.STRING,
                description: '2-3 sentence formal Bengali executive audit summary of income, expense, net balance, and period performance.'
              },
              keyFindings: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3 to 4 concise Bengali bullet points highlighting income/expense categories, staff activity, and cash flow.'
              },
              riskAlerts: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '1 to 3 Bengali monitoring alerts or confirmation that vouchers and expenses are within normal limits.'
              },
              aiRecommendation: {
                type: Type.STRING,
                description: '1-2 sentence actionable Bengali financial recommendation for Management & Share Partners.'
              },
              aiVerificationStatement: {
                type: Type.STRING,
                description: '1 short formal Bengali verification statement confirming AI Auto-Monitor verification and digital seal eligibility.'
              }
            },
            required: [
              'healthStatus',
              'auditScore',
              'executiveSummary',
              'keyFindings',
              'riskAlerts',
              'aiRecommendation',
              'aiVerificationStatement'
            ]
          }
        }
      });

      const rawText = (response.text || '{}').trim();
      const parsed = JSON.parse(rawText);
      res.json({
        ...parsed,
        generatedAt: new Date().toISOString(),
        source: 'gemini-ai'
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'AI মনিটরিং রিপোর্ট তৈরিতে ত্রুটি হয়েছে।';
      console.error('AI Monitoring Report Error:', err);
      res.status(500).json({ error: message });
    }
  });

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(
      express.static(distPath, {
        setHeaders: (res, filePath) => {
          if (
            filePath.endsWith('version.json') ||
            filePath.endsWith('sw.js') ||
            filePath.endsWith('manifest.json')
          ) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          }
        }
      })
    );
    app.get('*', (_req, res) => {
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DIP BHOLA NETWORK server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
