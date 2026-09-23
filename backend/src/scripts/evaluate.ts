import 'dotenv/config';
import { connectDB, disconnectDB } from '../config/db';
import { Kit, IKit } from '../models/Kit';
import { User } from '../models/User';
import { generateKit } from '../services/generation';
import { crawlCompanySite } from '../services/research';
import { Types } from 'mongoose';
import fs from 'fs/promises';
import path from 'path';

interface BatchCase {
  id: string;
  jd: string;
  company_url: string;
  days: number;
}

interface BatchOutput {
  version: string;
  generated_at: string;
  kits: Array<{
    id: string;
    status: 'ok' | 'failed';
    kit: IKit | null;
    error: { code: string; message: string } | null;
  }>;
}

async function processCase(
  caseData: BatchCase,
  userId: Types.ObjectId
): Promise<{ id: string; status: 'ok' | 'failed'; kit: IKit | null; error: any }> {
  const { id, jd, company_url, days } = caseData;

  try {
    const research = await crawlCompanySite(company_url);
    
    const homepageText = research.homepage?.text || '';
    const hiringPagesText = research.hiringPages.map(p => p.text);
    const hiringProcess = research.hiringPages.map(p => `${p.title}: ${p.text.slice(0, 500)}`).join('\n');
    const sources = [...new Set([...research.pages.map(p => p.url), ...research.hiringPages.map(p => p.url)])];
    const companyName = new URL(company_url).hostname;

    const generated = await generateKit(jd, company_url, days, {
      homepageText,
      hiringPagesText,
      hiringProcess,
      discussionSummary: '',
      sources,
      companyName
    });

    const kit = await Kit.create({
      userId,
      ...generated,
      status: 'completed'
    });

    return { id, status: 'ok', kit: kit.toObject(), error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    let code = 'GENERATION_FAILED';
    
    if (message.includes('fetch') || message.includes('network') || message.includes('timeout')) {
      code = 'COMPANY_UNREACHABLE';
    } else if (message.includes('Invalid URL')) {
      code = 'INVALID_URL';
    }

    return {
      id,
      status: 'failed',
      kit: null,
      error: { code, message }
    };
  }
}

async function runEvaluation(inputPath: string, outputPath: string): Promise<void> {
  await connectDB();

  let user = await User.findOne({ email: 'batch@eval.local' });
  if (!user) {
    const passwordHash = await User.hashPassword('batch-eval-password');
    user = await User.create({
      email: 'batch@eval.local',
      passwordHash,
      name: 'Batch Evaluator'
    });
  }

  const inputContent = await fs.readFile(inputPath, 'utf-8');
  const cases: BatchCase[] = JSON.parse(inputContent);

  console.log(`Processing ${cases.length} cases...`);

  const results: BatchOutput['kits'] = [];
  
  for (let i = 0; i < cases.length; i++) {
    const caseData = cases[i];
    console.log(`[${i + 1}/${cases.length}] Processing ${caseData.id}...`);
    
    const result = await processCase(caseData, user._id);
    results.push(result);
    
    console.log(`  ${result.status === 'ok' ? '✓' : '✗'} ${result.status}`);
    if (result.error) console.log(`  Error: ${result.error.code} - ${result.error.message}`);
  }

  const output: BatchOutput = {
    version: '1.0',
    generated_at: new Date().toISOString(),
    kits: results
  };

  await fs.writeFile(outputPath, JSON.stringify(output, null, 2));
  console.log(`\nResults written to ${outputPath}`);

  const okCount = results.filter(r => r.status === 'ok').length;
  const failedCount = results.filter(r => r.status === 'failed').length;
  console.log(`\nSummary: ${okCount} ok, ${failedCount} failed`);

  await disconnectDB();
}

const args = process.argv.slice(2);
const inputIndex = args.indexOf('--input');
const outputIndex = args.indexOf('--output');

if (inputIndex === -1 || outputIndex === -1) {
  console.error('Usage: npm run evaluate -- --input <cases.json> --output <kits.json>');
  process.exit(1);
}

const inputPath = path.resolve(args[inputIndex + 1]);
const outputPath = path.resolve(args[outputIndex + 1]);

runEvaluation(inputPath, outputPath).catch(err => {
  console.error('Evaluation failed:', err);
  process.exit(1);
});