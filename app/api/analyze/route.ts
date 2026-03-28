import { Anthropic } from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface AnalysisRequest {
  originalContract: string;
  newRequest: string;
}

interface ScopeFlag {
  item: string;
  status: 'out_of_scope' | 'gray_area' | 'in_scope';
  explanation: string;
  estimated_cost: string | null;
  cost_basis: string | null;
}

interface ScopeVerdict {
  verdict: 'out_of_scope' | 'gray_area' | 'in_scope';
  severity: number;
  summary: string;
  flags: ScopeFlag[];
  strategic_note: string | null;
  response_firm: string;
  response_flexible: string | null;
}

const SYSTEM_PROMPT = `You are ScopeShield, a scope creep analyzer for freelancers and contractors. Your job is to compare an original contract/SOW against a new client request and determine if the request falls within scope.

You MUST respond with valid JSON only. No markdown, no backticks, no preamble. Just the JSON object.

Analyze the request and return a JSON object with this exact structure:

{
  "verdict": "out_of_scope" | "gray_area" | "in_scope",
  "severity": <number 0-100>,
  "summary": "<one sentence verdict>",
  "flags": [
    {
      "item": "<what the client is asking for>",
      "status": "out_of_scope" | "gray_area" | "in_scope",
      "explanation": "<2-3 sentences explaining why this is or isn't in scope>",
      "estimated_cost": "<dollar range like '$500\u2013$1,000' or null if in scope>",
      "cost_basis": "<how you calculated it, e.g. '~8-12 hrs @ $75-100/hr (mid-market freelance rate for web development)' or null if in scope>"
    }
  ],
  "strategic_note": "<1-2 sentences of relationship/business advice for the freelancer, or null if straightforward>",
  "response_firm": "<professional, boundary-setting email response the freelancer can send. 100-200 words. Friendly but clear about what's in scope and what costs extra. Include specific pricing for out-of-scope items.>",
  "response_flexible": "<warmer, relationship-first email response. 100-200 words. Acknowledges the request positively, offers a small goodwill gesture if appropriate, but still establishes the boundary and pricing for extras. Only include if verdict is gray_area, otherwise null.>"
}

RULES:
- severity 0-25 = in_scope (green). The request is clearly covered by the contract.
- severity 26-60 = gray_area (amber). Some parts are covered, some aren't, or the contract language is ambiguous.
- severity 61-100 = out_of_scope (red). The request clearly exceeds what was agreed upon.
- Each distinct request or feature the client asks for should be a separate flag.
- Cost estimates should be realistic for the freelance/agency market. Base them on the type of work (web dev, design, copywriting, consulting, etc.) inferred from the contract.
- Always include cost_basis for every flag with an estimated_cost. Show the estimated hours and hourly rate range used. Example: "~4-6 hrs @ $100-150/hr (mid-market freelance web dev rate)".
- The response_firm should always price out-of-scope items individually.
- The response_flexible should only exist for gray_area verdicts. For clear out_of_scope or in_scope, set it to null.
- Never be hostile or adversarial in the responses. The tone is professional, confident, and collaborative.
- If the contract is vague or missing details, note that in the strategic_note and suggest the freelancer tighten their SOW for future projects.
- Do not add any text outside the JSON object. No explanations, no markdown formatting.`;

export async function POST(request: NextRequest) {
  try {
    const body: AnalysisRequest = await request.json();
    const { originalContract, newRequest } = body;

    if (!originalContract || !newRequest) {
      return NextResponse.json(
        { error: 'Both originalContract and newRequest are required' },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const userPrompt = \`CONTRACT:\n\${originalContract}\n\nREQUEST:\n\${newRequest}\`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const responseText =
      message.content[0].type === 'text' ? message.content[0].text : '';

    let verdict: ScopeVerdict;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      verdict = JSON.parse(jsonMatch[0]);

      // Validate required fields
      if (!verdict.verdict || !verdict.flags || !verdict.response_firm) {
        throw new Error('Missing required fields');
      }

      // Clamp severity to 0-100
      verdict.severity = Math.max(0, Math.min(100, verdict.severity));
    } catch {
      // Fallback error response
      return NextResponse.json({
        verdict: 'gray_area',
        severity: 50,
        summary: 'Unable to fully analyze. Please try rephrasing your inputs.',
        flags: [],
        strategic_note: null,
        response_firm: "We couldn't generate a response. Please try again with more detail in your contract and request.",
        response_flexible: null,
      });
    }

    return NextResponse.json(verdict);
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze request' },
      { status: 500 }
    );
  }
}

